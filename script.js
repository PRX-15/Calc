// ================================
// CALC 2.0
// ================================

const display = document.getElementById("display");
const expressionPreview = document.getElementById("expressionPreview");
const liveResult =
    document.getElementById("liveResult");

const themeButton = document.getElementById("themeButton");
const historyButton = document.getElementById("historyButton");

const historyOverlay = document.getElementById("historyOverlay");
const closeHistory = document.getElementById("closeHistory");
const historyList = document.getElementById("historyList");
const clearHistoryButton = document.getElementById("clearHistory");

let expression = "";
let justCalculated = false;

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

    updateLiveResult();
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
    // typing a number starts a new calculation.
    if (
        justCalculated &&
        !["+", "-", "*", "/"].includes(value)
    ) {

        expression = "";

        justCalculated = false;

        savedCursorStart = 0;
        savedCursorEnd = 0;
    }


    // Use the LAST known cursor position.
    // Do NOT focus first — that can move
    // the cursor to the end on mobile.

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


    // Insert the button's character
    // exactly where the cursor is.

    expression =
        expression.slice(0, start) +
        value +
        expression.slice(end);


    // New cursor position after insertion.

    const newPosition =
        start + value.length;


    savedCursorStart =
        newPosition;

    savedCursorEnd =
        newPosition;


    render(
        newPosition,
        newPosition
    );


    // Re-focus AFTER the value has been
    // updated, without changing the position.

    display.focus();

    display.setSelectionRange(
        newPosition,
        newPosition
    );
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

    if (!expression) {
        return;
    }

    vibrate(25);

    const original =
        expression;


    try {

        if (
            /[+\-*/.(]$/.test(expression)
        ) {
            throw new Error(
                "Incomplete expression"
            );
        }


        const tokens =
            tokenize(expression);


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


        expressionPreview.textContent =
            original + " =";


        expression =
            String(cleanResult);


        justCalculated = true;


        addHistory(
            original,
            cleanResult
        );


        render();


        display.classList.remove(
            "result-animation"
        );

        void display.offsetWidth;

        display.classList.add(
            "result-animation"
        );

    }

    catch {

        expressionPreview.textContent =
            original;

        expression = "Error";

        justCalculated = true;

        render();
    }
}
// ================================
// PERCENTAGE
// ================================

function percentage() {

    if (!expression) {
        return;
    }

    vibrate();

    try {

        const value =
            Number(expression);

        if (!Number.isFinite(value)) {
            return;
        }

        expression =
            String(value / 100);

        render();

    }

    catch {
        expression = "Error";
        render();
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

    localStorage.setItem(
        "calcHistory",
        JSON.stringify(history)
    );
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


    history.forEach((item) => {

        const row =
            document.createElement("div");

        row.className =
            "history-item";

        row.innerHTML = `
            <div class="history-expression">
                ${escapeHTML(item.calculation)}
            </div>

            <div class="history-result">
                = ${escapeHTML(item.result)}
            </div>
        `;


        // Tap history item to reuse result.
        row.addEventListener(
            "click",
            () => {

                vibrate();

                expression =
                    item.result;

                justCalculated = true;

                expressionPreview.textContent =
                    item.calculation + " =";

                closeHistoryPanel();

                render();
            }
        );

        historyList.appendChild(row);
    });
}


function escapeHTML(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
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