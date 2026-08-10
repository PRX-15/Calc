const display = document.getElementById("display");
const expressionPreview = document.getElementById("expressionPreview");

const historyButton = document.getElementById("historyButton");
const historyOverlay = document.getElementById("historyOverlay");
const closeHistory = document.getElementById("closeHistory");
const historyList = document.getElementById("historyList");
const clearHistoryButton = document.getElementById("clearHistory");

const themeButton = document.getElementById("themeButton");

let expression = "";
let justCalculated = false;

let history = JSON.parse(
    localStorage.getItem("calculatorHistory") || "[]"
);


/* ============================= */
/* DISPLAY */
/* ============================= */

function render() {
    display.value = expression;
}


/* ============================= */
/* BUTTON FEEDBACK */
/* ============================= */

function buttonFeedback() {
    if (navigator.vibrate) {
        navigator.vibrate(8);
    }
}


/* ============================= */
/* APPEND */
/* ============================= */

function append(value) {

    buttonFeedback();

    if (
        justCalculated &&
        !["+", "-", "*", "/"].includes(value)
    ) {
        expression = "";
    }

    justCalculated = false;

    const operators = ["+", "-", "*", "/"];
    const lastChar = expression.slice(-1);


    // Prevent consecutive operators
    if (
        operators.includes(value) &&
        operators.includes(lastChar)
    ) {
        expression =
            expression.slice(0, -1) + value;
    }


    // Decimal handling
    else if (value === ".") {

        const currentNumber =
            expression.split(/[+\-*/]/).pop();

        if (currentNumber.includes(".")) {
            return;
        }

        expression += value;
    }


    else {
        expression += value;
    }

    render();
}


/* ============================= */
/* CLEAR */
/* ============================= */

function clearDisplay() {

    buttonFeedback();

    expression = "";
    justCalculated = false;

    expressionPreview.textContent = "";

    render();
}


/* ============================= */
/* DELETE */
/* ============================= */

function deleteLast() {

    buttonFeedback();

    expression =
        expression.slice(0, -1);

    justCalculated = false;

    render();
}


/* ============================= */
/* CALCULATE */
/* ============================= */

function calculate() {

    if (!expression) return;

    buttonFeedback();

    if (/[+\-*/.]$/.test(expression)) {
        return;
    }

    try {

        const originalExpression = expression;

        const tokens = expression.match(
            /(?:\d+(?:\.\d*)?|\.\d+)|[+\-*/]/g
        );

        if (
            !tokens ||
            tokens.join("") !== expression
        ) {
            throw new Error();
        }

        let result = Number(tokens[0]);

        if (!Number.isFinite(result)) {
            throw new Error();
        }


        for (
            let i = 1;
            i < tokens.length;
            i += 2
        ) {

            const operator = tokens[i];

            const number =
                Number(tokens[i + 1]);


            if (!Number.isFinite(number)) {
                throw new Error();
            }


            if (operator === "+") {
                result += number;
            }

            else if (operator === "-") {
                result -= number;
            }

            else if (operator === "*") {
                result *= number;
            }

            else if (operator === "/") {

                if (number === 0) {
                    throw new Error();
                }

                result /= number;
            }
        }


        if (!Number.isFinite(result)) {
            throw new Error();
        }


        result =
            Number(result.toPrecision(12));


        expressionPreview.textContent =
            originalExpression.replace(/\*/g, "×")
                .replace(/\//g, "÷");


        expression = String(result);

        justCalculated = true;

        render();

        display.classList.remove("result-animation");

        void display.offsetWidth;

        display.classList.add("result-animation");


        addHistory(
            originalExpression,
            String(result)
        );

    }

    catch {

        expression = "Error";

        justCalculated = true;

        render();
    }
}


/* ============================= */
/* HISTORY */
/* ============================= */

function addHistory(expressionValue, result) {

    history.unshift({
        expression: expressionValue,
        result: result
    });

    // Keep latest 50
    history = history.slice(0, 50);

    localStorage.setItem(
        "calculatorHistory",
        JSON.stringify(history)
    );

    renderHistory();
}


function renderHistory() {

    if (history.length === 0) {

        historyList.innerHTML =
            `<p class="empty-history">
                No calculations yet.
            </p>`;

        return;
    }


    historyList.innerHTML =
        history.map((item, index) => {

            const formattedExpression =
                item.expression
                    .replace(/\*/g, "×")
                    .replace(/\//g, "÷");

            return `
                <div
                    class="history-item"
                    data-index="${index}"
                >
                    <div class="history-expression">
                        ${formattedExpression}
                    </div>

                    <div class="history-result">
                        = ${item.result}
                    </div>
                </div>
            `;

        }).join("");


    document
        .querySelectorAll(".history-item")
        .forEach(item => {

            item.addEventListener("click", () => {

                const selected =
                    history[item.dataset.index];

                expression = selected.result;

                justCalculated = true;

                render();

                closeHistoryPanel();
            });
        });
}


function openHistoryPanel() {

    buttonFeedback();

    renderHistory();

    historyOverlay.classList.add("active");
}


function closeHistoryPanel() {

    historyOverlay.classList.remove("active");
}


function clearHistory() {

    buttonFeedback();

    history = [];

    localStorage.removeItem(
        "calculatorHistory"
    );

    renderHistory();
}


/* ============================= */
/* HISTORY EVENTS */
/* ============================= */

historyButton.addEventListener(
    "click",
    openHistoryPanel
);

closeHistory.addEventListener(
    "click",
    closeHistoryPanel
);

clearHistoryButton.addEventListener(
    "click",
    clearHistory
);

historyOverlay.addEventListener(
    "click",
    (event) => {

        if (event.target === historyOverlay) {
            closeHistoryPanel();
        }

    }
);


/* ============================= */
/* THEME */
/* ============================= */

function loadTheme() {

    const savedTheme =
        localStorage.getItem("calculatorTheme");

    if (savedTheme === "light") {

        document.body.classList.add("light");

        themeButton.textContent = "🌙";
    }

    else {

        themeButton.textContent = "☀️";
    }
}


function toggleTheme() {

    buttonFeedback();

    document.body.classList.toggle("light");

    const isLight =
        document.body.classList.contains("light");


    localStorage.setItem(
        "calculatorTheme",
        isLight ? "light" : "dark"
    );


    themeButton.textContent =
        isLight ? "🌙" : "☀️";
}


themeButton.addEventListener(
    "click",
    toggleTheme
);


/* ============================= */
/* KEYBOARD */
/* ============================= */

window.addEventListener(
    "keydown",
    (event) => {

        const key = event.key;


        if (/^[0-9.]$/.test(key)) {
            append(key);
        }


        else if (
            ["+", "-", "*", "/"].includes(key)
        ) {
            append(key);
        }


        else if (
            key === "Enter" ||
            key === "="
        ) {

            event.preventDefault();

            calculate();
        }


        else if (key === "Backspace") {

            event.preventDefault();

            deleteLast();
        }


        else if (
            key === "Escape" ||
            key.toLowerCase() === "c"
        ) {

            clearDisplay();
        }

    }
);


/* ============================= */
/* START */
/* ============================= */

renderHistory();
loadTheme();
render();