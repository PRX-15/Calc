// ================================
// CALC 2.0
// ================================

const display = document.getElementById("display");
const expressionPreview = document.getElementById("expressionPreview");

const themeButton = document.getElementById("themeButton");
const historyButton = document.getElementById("historyButton");

const historyOverlay = document.getElementById("historyOverlay");
const closeHistory = document.getElementById("closeHistory");
const historyList = document.getElementById("historyList");
const clearHistoryButton = document.getElementById("clearHistory");

let expression = "";
let justCalculated = false;

let history = JSON.parse(
    localStorage.getItem("calcHistory") || "[]"
);


// ================================
// DISPLAY
// ================================

function render() {
    display.value = expression || "0";
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

    // If a result was just calculated:
    // typing a number starts a new calculation.
    if (
        justCalculated &&
        !["+", "-", "*", "/"].includes(value)
    ) {
        expression = "";
    }

    justCalculated = false;

    const operators = ["+", "-", "*", "/"];
    const last = expression.slice(-1);


    // Prevent two operators together.
    if (
        operators.includes(value) &&
        operators.includes(last)
    ) {
        expression =
            expression.slice(0, -1) + value;

        render();
        return;
    }


    // Don't start with an operator except minus.
    if (
        expression === "" &&
        operators.includes(value) &&
        value !== "-"
    ) {
        return;
    }


    // Decimal handling.
    if (value === ".") {

        const currentNumber =
            expression.split(/[+\-*/]/).pop();

        if (currentNumber.includes(".")) {
            return;
        }

        if (
            currentNumber === "" ||
            currentNumber === "-"
        ) {
            expression += "0";
        }
    }


    expression += value;

    render();
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

    expression =
        expression.slice(0, -1);

    justCalculated = false;

    render();
}


// ================================
// SAFE MATH PARSER
// ================================

function tokenize(input) {

    const tokens = [];

    let number = "";

    for (let i = 0; i < input.length; i++) {

        const char = input[i];

        if (
            /[0-9.]/.test(char)
        ) {
            number += char;
            continue;
        }

        if (
            ["+", "-", "*", "/"].includes(char)
        ) {

            if (number !== "") {

                tokens.push(
                    Number(number)
                );

                number = "";
            }

            tokens.push(char);
        }
    }

    if (number !== "") {
        tokens.push(Number(number));
    }

    return tokens;
}


// ================================
// OPERATOR PRECEDENCE
// ================================

function evaluate(tokens) {

    // First: × and ÷
    for (let i = 0; i < tokens.length; i++) {

        if (
            tokens[i] === "*" ||
            tokens[i] === "/"
        ) {

            const left = tokens[i - 1];
            const right = tokens[i + 1];

            if (
                typeof left !== "number" ||
                typeof right !== "number"
            ) {
                throw new Error();
            }

            if (
                tokens[i] === "/" &&
                right === 0
            ) {
                throw new Error(
                    "Cannot divide by zero"
                );
            }

            const result =
                tokens[i] === "*"
                    ? left * right
                    : left / right;

            tokens.splice(
                i - 1,
                3,
                result
            );

            i -= 2;
        }
    }


    // Then: + and -
    let result = tokens[0];

    for (
        let i = 1;
        i < tokens.length;
        i += 2
    ) {

        const operator = tokens[i];
        const number = tokens[i + 1];

        if (
            typeof number !== "number"
        ) {
            throw new Error();
        }

        if (operator === "+") {
            result += number;
        }

        else if (operator === "-") {
            result -= number;
        }

        else {
            throw new Error();
        }
    }

    return result;
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

        // Don't calculate incomplete expressions.
        if (
            /[+\-*/.]$/.test(expression)
        ) {
            return;
        }

        const tokens =
            tokenize(expression);

        if (
            tokens.length === 0 ||
            typeof tokens[0] !== "number"
        ) {
            throw new Error();
        }

        const result =
            evaluate(tokens);

        if (
            !Number.isFinite(result)
        ) {
            throw new Error();
        }


        // Keep results readable.
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

function loadTheme() {

    const saved =
        localStorage.getItem(
            "calcTheme"
        );

    if (saved === "light") {

        document.body.classList.add(
            "light"
        );

        themeButton.textContent =
            "☾";
    }

    else {

        document.body.classList.remove(
            "light"
        );

        themeButton.textContent =
            "☼";
    }
}


function toggleTheme() {

    vibrate();

    document.body.classList.toggle(
        "light"
    );

    const light =
        document.body.classList.contains(
            "light"
        );

    localStorage.setItem(
        "calcTheme",
        light
            ? "light"
            : "dark"
    );

    themeButton.textContent =
        light
            ? "☾"
            : "☼";
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