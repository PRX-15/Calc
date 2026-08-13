// ================================
// CALC 2.0
// ================================

const display = document.getElementById("display");
const expressionPreview = document.getElementById("expressionPreview");
const liveResult =
    document.getElementById("liveResult");
const copyResultButton =
    document.getElementById("copyResult");
const copyToast =
    document.getElementById("copyToast");

const themeButton = document.getElementById("themeButton");
const historyButton = document.getElementById("historyButton");

const historyOverlay = document.getElementById("historyOverlay");
const closeHistory = document.getElementById("closeHistory");
const historyList = document.getElementById("historyList");
const clearHistoryButton = document.getElementById("clearHistory");

let expression = "";
let justCalculated = false;

// ================================
// BUTTON PRESS ANIMATION
// ================================

document.querySelectorAll(".buttons button").forEach(button => {

    button.addEventListener("pointerdown", () => {

        // Start the press/shrink state
        button.classList.add("is-pressed");

        // Create a NEW glow for this tap.
        // This allows multiple taps to overlap.
        const glow = document.createElement("span");

        glow.className = "tap-glow";

        button.appendChild(glow);

        // Remove this individual glow
        // after its animation finishes.
        glow.addEventListener("animationend", () => {
            glow.remove();
        }, { once: true });

    });


    button.addEventListener("pointerup", () => {
        button.classList.remove("is-pressed");
    });


    button.addEventListener("pointercancel", () => {
        button.classList.remove("is-pressed");
    });


    button.addEventListener("pointerleave", () => {
        button.classList.remove("is-pressed");
    });

});

let history = [];

try {
    history =
        JSON.parse(
            localStorage.getItem("calcHistory") || "[]"
        );

    if (!Array.isArray(history)) {
        history = [];
    }

} catch {
    history = [];
}

// ================================
// MOBILE CARET / CURSOR SUPPORT
// ================================

let savedCursorStart = 0;
let savedCursorEnd = 0;


function saveCursorPosition() {

    if (
        document.activeElement === display &&
        display.selectionStart !== null
    ) {

        savedCursorStart =
            display.selectionStart;

        savedCursorEnd =
            display.selectionEnd;
    }
}


// Save cursor whenever the user
// taps/drags/selects inside the display.

display.addEventListener(
    "select",
    saveCursorPosition
);

display.addEventListener(
    "keyup",
    saveCursorPosition
);

display.addEventListener(
    "pointerup",
    saveCursorPosition
);

display.addEventListener(
    "touchend",
    saveCursorPosition
);

display.addEventListener(
    "input",
    function () {

        const candidate =
            display.value;

        // Valid user-entered expression.
        if (isInputValid(candidate)) {

            expression =
                candidate;

            savedCursorStart =
                display.selectionStart ?? candidate.length;

            savedCursorEnd =
                display.selectionEnd ?? candidate.length;

            justCalculated = false;

            updateLiveResult();

            return;
        }

        // Invalid input:
        // restore the last valid expression.
        display.value =
            expression || "0";

        display.setSelectionRange(
            savedCursorStart,
            savedCursorEnd
        );

        updateLiveResult();
    }
);

copyResultButton.addEventListener(
    "click",
    copyResult
);


// ================================
// DISPLAY
// ================================

function render(
    cursorStart = savedCursorStart,
    cursorEnd = savedCursorEnd
) {

    display.value =
        expression || "0";


        if (
        document.activeElement === display
    ) {

        const start =
            Math.min(
                cursorStart,
                display.value.length
            );

        const end =
            Math.min(
                cursorEnd,
                display.value.length
            );

        display.setSelectionRange(
            start,
            end
        );

        savedCursorStart = start;
        savedCursorEnd = end;
    }

    updateLiveResult();
}

// ================================
// COPY RESULT
// ================================

async function copyResult() {

    let result = "";

    // If we just calculated something,
    // expression contains the final result.
    if (
        justCalculated &&
        expression &&
        expression !== "Error"
    ) {
        result = expression;
    }

    // Otherwise use the live result.
    else if (
        liveResult.textContent.trim()
    ) {
        result =
            liveResult.textContent.trim();
    }

    // Nothing available to copy.
    if (!result) {
        return;
    }

    try {

        await navigator.clipboard.writeText(
            result
        );

        vibrate();

        copyResultButton.classList.add(
            "copied"
        );

        copyResultButton.textContent =
            "✓";

        copyResultButton.setAttribute(
            "aria-label",
            "Result copied"
        );

        copyToast.classList.remove("visible");

// Restart the animation if copied repeatedly.
void copyToast.offsetWidth;

copyToast.classList.add("visible");

setTimeout(() => {
    copyToast.classList.remove("visible");
}, 1000);

        setTimeout(() => {

            copyResultButton.classList.remove(
                "copied"
            );

            copyResultButton.textContent =
                "⧉";

            copyResultButton.setAttribute(
                "aria-label",
                "Copy result"
            );

        }, 1000);

    } catch (error) {

        console.error(
            "Copy failed:",
            error
        );
    }
}


// ================================
// HAPTIC FEEDBACK
// ================================

function vibrate(ms = 12) {
    if ("vibrate" in navigator) {
        navigator.vibrate(ms);
    }
}


// ================================
// INPUT
// ================================

function append(value) {

    vibrate();

    // If we just calculated a result,
    // typing a new number starts a new calculation.
    if (
        justCalculated &&
        !["+", "-", "*", "/", ")", "."].includes(value)
    ) {
        expression = "";
        justCalculated = false;

        savedCursorStart = 0;
        savedCursorEnd = 0;
    }

    const start =
        Math.min(
            savedCursorStart,
            expression.length
        );

    const end =
        Math.min(
            savedCursorEnd,
            expression.length
        );

    const before =
        expression.slice(0, start);

    const after =
        expression.slice(end);

    let newValue = value;

    // --------------------------------
    // DECIMAL
    // --------------------------------

    if (newValue === ".") {

        // Don't put a decimal after ")"
        if (before.endsWith(")")) {
            return;
        }

        // Find the number immediately before
        // the cursor.
        const leftNumber =
            before.split(/[+\-*/()]/).pop();

        // Find the number immediately after
        // the cursor.
        const rightNumber =
            after.split(/[+\-*/()]/)[0];

        // If either side already contains a decimal,
        // inserting another one would create
        // something like 12.3.4
        if (
            leftNumber.includes(".") ||
            rightNumber.includes(".")
        ) {
            return;
        }

        // If "." starts a new number,
        // turn it into "0."
        if (
            !before ||
            ["+", "-", "*", "/", "("].includes(
                before.slice(-1)
            )
        ) {
            newValue = "0.";
        }
    }

    // --------------------------------
    // OPERATORS
    // --------------------------------

    if (
        ["+", "-", "*", "/"].includes(newValue)
    ) {

        const previous =
            before.slice(-1);

        const next =
            after.slice(0, 1);

        // Only "-" is allowed to begin
        // an expression as unary minus.
        if (
            !previous &&
            newValue !== "-"
        ) {
            return;
        }

        // Don't allow two operators together.
        if (
            ["+", "-", "*", "/"].includes(previous)
        ) {
            // Allow unary minus after "("
            if (
                !(
                    previous === "(" &&
                    newValue === "-"
                )
            ) {
                return;
            }
        }

        // Don't allow an operator immediately
        // before ")"
        if (next === ")") {
            return;
        }

        // Don't allow + * / after "("
        if (
            previous === "(" &&
            newValue !== "-"
        ) {
            return;
        }
   
        // Continue from the calculated result.
    if (justCalculated) {
        justCalculated = false;
    }
}

    // --------------------------------
    // OPENING PARENTHESIS
    // --------------------------------

    if (newValue === "(") {

        const previous =
            before.slice(-1);

        // Don't allow 2( or )(.
        if (
            /[0-9)]/.test(previous)
        ) {
            return;
        }
    }

    // --------------------------------
    // CLOSING PARENTHESIS
    // --------------------------------

    if (newValue === ")") {

        const previous =
            before.slice(-1);

        // Must have something before it.
        if (!previous) {
            return;
        }

        // Can't be after an operator or "("
        if (
            ["+", "-", "*", "/", "("].includes(
                previous
            )
        ) {
            return;
        }

        // Count parentheses in the expression
        // BEFORE inserting this one.
        const openCount =
            (before.match(/\(/g) || []).length;

        const closeCount =
            (before.match(/\)/g) || []).length;

        // Can't close something that isn't open.
        if (closeCount >= openCount) {
            return;
        }

        // Don't allow "(2)3"
        if (
            after &&
            /[0-9(]/.test(after[0])
        ) {
            return;
        }
    }

    // --------------------------------
    // BUILD CANDIDATE EXPRESSION
    // --------------------------------

    const candidate =
        before +
        newValue +
        after;

    // --------------------------------
    // FINAL VALIDATION
    // --------------------------------

    if (!isInputValid(candidate)) {
        return;
    }

    // --------------------------------
    // INSERT
    // --------------------------------

    expression = candidate;

    const newPosition =
        start + newValue.length;

    savedCursorStart =
        newPosition;

    savedCursorEnd =
        newPosition;

    render(
        newPosition,
        newPosition
    );

    display.focus();

    display.setSelectionRange(
        newPosition,
        newPosition
    );
}

function isInputValid(input) {

    if (!input) {
        return true;
    }

    // --------------------------------
    // INVALID CHARACTERS
    // --------------------------------

    if (
        !/^[0-9+\-*/().]*$/.test(input)
    ) {
        return false;
    }

    // --------------------------------
    // INVALID DECIMAL PATTERNS
    // --------------------------------

    const numbers =
        input.split(/[+\-*/()]/);

    for (const number of numbers) {

        if (!number) {
            continue;
        }

        // More than one decimal in one number.
        if (
            (number.match(/\./g) || []).length > 1
        ) {
            return false;
        }

        // "." is not allowed by itself.
        if (number === ".") {
            return false;
        }
    }

    // --------------------------------
    // PARENTHESES
    // --------------------------------

    let balance = 0;

    for (let i = 0; i < input.length; i++) {

        const char = input[i];

        if (char === "(") {
            balance++;
        }

        if (char === ")") {

            balance--;

            // Closing before opening.
            if (balance < 0) {
                return false;
            }
        }
    }

    // Don't allow more closing than opening.
    if (balance < 0) {
        return false;
    }

    // --------------------------------
    // INVALID OPERATOR SEQUENCES
    // --------------------------------

    if (
        /[+*/]{2}/.test(input)
    ) {
        return false;
    }

    // Two "-" operators can still be valid
    // in cases like 5--2, so don't reject
    // every double-minus automatically.

    // --------------------------------
    // INVALID OPERATOR BEFORE ")"
    // --------------------------------

    if (
        /[+\-*/(]\)/.test(input)
    ) {
        return false;
    }

    // --------------------------------
    // INVALID "NUMBER("
    // --------------------------------

    if (
        /[0-9]\(/.test(input)
    ) {
        return false;
    }

    // --------------------------------
    // INVALID ")NUMBER"
    // --------------------------------

    if (
        /\)[0-9(]/.test(input)
    ) {
        return false;
    }

    return true;
}
// ================================
// CLEAR
// ================================

function clearDisplay() {

    vibrate(20);

    expression = "";
    justCalculated = false;

    expressionPreview.textContent = "";

    render();
}


// ================================
// DELETE
// ================================

function deleteLast() {

    vibrate();


    const start =
        Math.min(
            savedCursorStart,
            expression.length
        );

    const end =
        Math.min(
            savedCursorEnd,
            expression.length
        );


    // If text is selected,
    // delete the selected text.

    if (start !== end) {

        expression =
            expression.slice(0, start) +
            expression.slice(end);


        savedCursorStart = start;
        savedCursorEnd = start;


        render(start, start);

        return;
    }


    // Nothing selected:
    // delete character before cursor.

    if (start > 0) {

        expression =
            expression.slice(0, start - 1) +
            expression.slice(start);


        const newPosition =
            start - 1;


        savedCursorStart =
            newPosition;

        savedCursorEnd =
            newPosition;


        render(
            newPosition,
            newPosition
        );
    }
}


// ================================
// MATH PARSER
// () → × ÷ → + −
// ================================

function tokenize(input) {
    const tokens = [];
    let number = "";

    for (const char of input) {

        if (/[0-9.]/.test(char)) {
            number += char;
            continue;
        }

        if (number) {
            const n = Number(number);

            if (!Number.isFinite(n)) {
                throw new Error("Invalid number");
            }

            tokens.push(n);
            number = "";
        }

        if (["+", "-", "*", "/", "(", ")"].includes(char)) {
            tokens.push(char);
        }
        else {
            throw new Error("Invalid character");
        }
    }

    if (number) {
        const n = Number(number);

        if (!Number.isFinite(n)) {
            throw new Error("Invalid number");
        }

        tokens.push(n);
    }

    return tokens;
}


function evaluate(tokens) {

    let position = 0;


    // ----------------------------
    // Numbers + parentheses
    // ----------------------------

    function primary() {

        const token = tokens[position];


        // Negative number
        if (token === "-") {
            position++;
            return -primary();
        }


        // (
        if (token === "(") {

            position++;

            const value =
                parseExpression();

            if (tokens[position] !== ")") {
                throw new Error(
                    "Missing )"
                );
            }

            position++;

            return value;
        }


        // Number
        if (typeof token === "number") {

            position++;

            return token;
        }


        throw new Error(
            "Invalid expression"
        );
    }


    // ----------------------------
    // × ÷
    // ----------------------------

    function parseTerm() {

        let value =
            primary();


        while (
            tokens[position] === "*" ||
            tokens[position] === "/"
        ) {

            const operator =
                tokens[position];

            position++;

            const right =
                primary();


            if (
                operator === "/" &&
                right === 0
            ) {
                throw new Error(
                    "Cannot divide by zero"
                );
            }


            if (operator === "*") {
                value *= right;
            }
            else {
                value /= right;
            }
        }

        return value;
    }


    // ----------------------------
    // + −
    // ----------------------------

    function parseExpression() {

        let value =
            parseTerm();


        while (
            tokens[position] === "+" ||
            tokens[position] === "-"
        ) {

            const operator =
                tokens[position];

            position++;

            const right =
                parseTerm();


            if (operator === "+") {
                value += right;
            }
            else {
                value -= right;
            }
        }

        return value;
    }


    const result =
        parseExpression();


    if (
        position !== tokens.length
    ) {
        throw new Error(
            "Invalid expression"
        );
    }


    return result;
}

// ================================
// LIVE CALCULATION
// ================================

function updateLiveResult() {

    // Nothing to calculate.
    if (
        !expression ||
        expression === "Error" ||
        justCalculated
    ) {

        liveResult.textContent = "";

        liveResult.classList.remove(
            "visible"
        );

        return;
    }


    try {

        // Don't show an answer while the
        // expression is obviously incomplete.

        if (
            /[+\-*/.(]$/.test(expression)
        ) {

            liveResult.textContent = "";

            liveResult.classList.remove(
                "visible"
            );

            return;
        }


        const tokens =
            tokenize(expression);


        // Empty expression.
        if (!tokens.length) {

            liveResult.textContent = "";

            liveResult.classList.remove(
                "visible"
            );

            return;
        }


        // Check parentheses.
        let balance = 0;

        for (const token of tokens) {

            if (token === "(") {
                balance++;
            }

            if (token === ")") {
                balance--;

                if (balance < 0) {
                    throw new Error();
                }
            }
        }


        // Don't show result until all
        // parentheses are closed.

        if (balance !== 0) {

            liveResult.textContent = "";

            liveResult.classList.remove(
                "visible"
            );

            return;
        }


        const result =
            evaluate(tokens);


        if (
            !Number.isFinite(result)
        ) {
            throw new Error();
        }


        const cleanResult =
            Number(
                result.toPrecision(12)
            );


        liveResult.textContent =
            String(cleanResult);


        liveResult.classList.add(
            "visible"
        );

    }

    catch {

        // Invalid/incomplete expression.
        // Don't annoy the user with "Error"
        // while they're still typing.

        liveResult.textContent = "";

        liveResult.classList.remove(
            "visible"
        );
    }
}

// ================================
// CALCULATE
// ================================

function calculate() {

    if (!expression || expression === "Error") {
        return;
    }

    vibrate(25);

    const original = expression;

    try {

        if (/[+\-*/.(]$/.test(expression)) {
            return;
        }

        const tokens = tokenize(expression);

        const result = evaluate(tokens);

        if (!Number.isFinite(result)) {
            return;
        }

        const cleanResult =
            Number(result.toPrecision(12));

        expressionPreview.textContent =
            original + " =";

        expression =
            String(cleanResult);

        justCalculated = true;

        // History should NEVER be allowed
        // to break the calculator.
        try {
            addHistory(original, cleanResult);
        } catch (historyError) {
            console.error(
                "History error:",
                historyError
            );
        }

        render();

        display.classList.remove(
            "result-animation"
        );

        void display.offsetWidth;

        display.classList.add(
            "result-animation"
        );

    } catch (error) {

        console.error(
            "Calculator error:",
            error
        );

        expressionPreview.textContent =
            original;

        expression =
            "Error";

        justCalculated = true;

        render();
    }
}
// ================================
// PERCENTAGE
// ================================

function percentage() {

    if (!expression || expression === "Error") {
        return;
    }

    vibrate();

    try {

        // Find the last number in the expression.
        const match =
            expression.match(
                /(?:^|[+\-*/(])(-?\d*\.?\d+)$/
            );

        if (!match) {
            return;
        }

        const numberText =
            match[1];

        const value =
            Number(numberText);

        if (!Number.isFinite(value)) {
            return;
        }

        // Position of the last number.
        const numberStart =
            expression.length - numberText.length;

        // Everything before the last number.
        const before =
            expression.slice(0, numberStart);

        // Find the operator immediately before
        // the number.
        const operator =
            before.slice(-1);

        // --------------------------------
        // SIMPLE NUMBER
        // --------------------------------

        if (
            !operator ||
            ["("].includes(operator)
        ) {

            expression =
                String(value / 100);

            justCalculated = false;

            render();

            return;
        }

        // --------------------------------
        // ADDITION / SUBTRACTION
        // --------------------------------
        //
        // 200 + 10%  →  200 + 20
        // 200 - 10%  →  200 - 20
        //
        // The percentage is based on the
        // value immediately before + or -.

        if (
            operator === "+" ||
            operator === "-"
        ) {

            const baseExpression =
                before.slice(0, -1);

            try {

                const baseTokens =
                    tokenize(baseExpression);

                const base =
                    evaluate(baseTokens);

                if (
                    !Number.isFinite(base)
                ) {
                    return;
                }

                const percentageValue =
                    base * value / 100;

                expression =
                    baseExpression +
                    operator +
                    String(
                        Number(
                            percentageValue
                                .toPrecision(12)
                        )
                    );

                justCalculated = false;

                render();

                return;

            } catch {
                return;
            }
        }

        // --------------------------------
        // MULTIPLICATION / DIVISION
        // --------------------------------
        //
        // 200 × 10% → 200 × 0.1 → 20
        // 200 ÷ 10% → 200 ÷ 0.1 → 2000

        if (
            operator === "*" ||
            operator === "/"
        ) {

            expression =
                before +
                String(
                    Number(
                        (value / 100)
                            .toPrecision(12)
                    )
                );

            justCalculated = false;

            render();

            return;
        }

    }

    catch {
        return;
    }
}

// ================================
// PLUS / MINUS
// ================================

function toggleSign() {

    if (!expression) {
        return;
    }

    vibrate();

    if (expression.startsWith("-")) {
        expression =
            expression.slice(1);
    }

    else {
        expression =
            "-" + expression;
    }

    render();
}


// ================================
// SQUARE ROOT
// ================================

function squareRoot() {

    if (!expression) {
        return;
    }

    vibrate();

    const value =
        Number(expression);

    if (
        !Number.isFinite(value) ||
        value < 0
    ) {
        expression = "Error";
        justCalculated = true;
        render();
        return;
    }

    const result =
        Math.sqrt(value);

    expressionPreview.textContent =
        `√${value}`;

    expression =
        String(
            Number(result.toPrecision(12))
        );

    justCalculated = true;

    render();
}


// ================================
// HISTORY
// ================================

function addHistory(
    calculation,
    result
) {

    history.unshift({
        calculation,
        result: String(result),
        time: Date.now()
    });

    // Keep last 50 calculations.
    history =
        history.slice(0, 50);

    saveHistory();
    renderHistory();
}


function saveHistory() {

    try {

        localStorage.setItem(
            "calcHistory",
            JSON.stringify(history)
        );

    } catch (error) {

        console.error(
            "Could not save history:",
            error
        );

    }
}


function renderHistory() {

    historyList.innerHTML = "";

    if (history.length === 0) {

        const empty =
            document.createElement("div");

        empty.className =
            "empty-history";

        empty.textContent =
            "No calculations yet.";

        historyList.appendChild(empty);

        return;
    }


    history.forEach((item, index) => {

        const row =
            document.createElement("div");

        row.className =
            "history-item";


        // --------------------------------
        // CALCULATION
        // --------------------------------

        const calculation =
            document.createElement("div");

        calculation.className =
            "history-expression";

        calculation.textContent =
            item.calculation;


        // --------------------------------
        // RESULT
        // --------------------------------

        const result =
            document.createElement("div");

        result.className =
            "history-result";

        result.textContent =
            `= ${item.result}`;


        // --------------------------------
        // TIME
        // --------------------------------

        const time =
            document.createElement("div");

        time.className =
            "history-time";

        if (item.time) {

            const date =
                new Date(item.time);

            time.textContent =
                date.toLocaleString(
                    undefined,
                    {
                        dateStyle: "short",
                        timeStyle: "short"
                    }
                );

        }
        else {

            time.textContent =
                "Unknown time";
        }


        // --------------------------------
        // DELETE BUTTON
        // --------------------------------

        const deleteButton =
            document.createElement("button");

        deleteButton.type =
            "button";

        deleteButton.className =
            "history-delete";

        deleteButton.textContent =
            "×";

        deleteButton.setAttribute(
            "aria-label",
            "Delete calculation"
        );


        deleteButton.addEventListener(
            "click",
            (event) => {

                event.stopPropagation();

                deleteHistoryItem(index);
            }
        );


        // --------------------------------
        // CONTENT WRAPPER
        // --------------------------------

        const content =
            document.createElement("div");

        content.className =
            "history-content";

        content.appendChild(
            calculation
        );

        content.appendChild(
            result
        );

        content.appendChild(
            time
        );


        row.appendChild(
            content
        );

        row.appendChild(
            deleteButton
        );


        // --------------------------------
        // REUSE HISTORY ITEM
        // --------------------------------

        row.addEventListener(
            "click",
            () => {

                vibrate();

                expression =
                    item.result;

                justCalculated =
                    true;

                expressionPreview.textContent =
                    item.calculation + " =";

                closeHistoryPanel();

                render();
            }
        );


        historyList.appendChild(row);
    });
}

function deleteHistoryItem(index) {

    vibrate();

    if (
        index < 0 ||
        index >= history.length
    ) {
        return;
    }

    history.splice(
        index,
        1
    );

    saveHistory();

    renderHistory();
}

// ================================
// CLEAR HISTORY
// ================================

function clearHistory() {

    vibrate(20);

    history = [];

    saveHistory();

    renderHistory();
}


// ================================
// HISTORY PANEL
// ================================

function openHistory() {

    vibrate();

    renderHistory();

    historyOverlay.classList.add(
        "active"
    );
}


function closeHistoryPanel() {

    historyOverlay.classList.remove(
        "active"
    );
}


historyButton.addEventListener(
    "click",
    openHistory
);


closeHistory.addEventListener(
    "click",
    closeHistoryPanel
);


clearHistoryButton.addEventListener(
    "click",
    clearHistory
);


// Tap outside panel to close.
historyOverlay.addEventListener(
    "click",
    (event) => {

        if (
            event.target === historyOverlay
        ) {
            closeHistoryPanel();
        }
    }
);


// ================================
// DARK / LIGHT THEME
// ================================

function applyTheme(theme) {

    const isLight =
        theme === "light";


    document.body.classList.toggle(
        "light",
        isLight
    );


    document.documentElement.style
        .setProperty(
            "color-scheme",
            isLight
                ? "light"
                : "dark"
        );


    themeButton.textContent =
        isLight
            ? "☾"
            : "☼";
}


function loadTheme() {

    const saved =
        localStorage.getItem(
            "calcTheme"
        );


    if (saved === "light") {

        applyTheme("light");

    }

    else {

        applyTheme("dark");

    }
}


function toggleTheme() {

    vibrate();


    const currentlyLight =
        document.body.classList.contains(
            "light"
        );


    const nextTheme =
        currentlyLight
            ? "dark"
            : "light";


    localStorage.setItem(
        "calcTheme",
        nextTheme
    );


    applyTheme(
        nextTheme
    );
}


themeButton.addEventListener(
    "click",
    toggleTheme
);
// ================================
// KEYBOARD SUPPORT
// ================================

window.addEventListener(
    "keydown",
    (event) => {

        const key =
            event.key;


        // Numbers / decimal
        if (
            /^[0-9.]$/.test(key)
        ) {

            append(key);

            return;
        }


        // Operators
        if (
            ["+", "-", "*", "/"].includes(key)
        ) {

            append(key);

            return;
        }


        // Enter
        if (
            key === "Enter" ||
            key === "="
        ) {

            event.preventDefault();

            calculate();

            return;
        }


        // Backspace
        if (
            key === "Backspace"
        ) {

            deleteLast();

            return;
        }


        // Escape
        if (
            key === "Escape"
        ) {

            clearDisplay();

            return;
        }


        // Percentage
        if (key === "%") {

            percentage();

            return;
        }
    }
);


// ================================
// INITIALISE
// ================================

loadTheme();

renderHistory();

render();

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("./sw.js")
            .catch(error => {
                console.error(
                    "Service Worker registration failed:",
                    error
                );
            });
    });
}