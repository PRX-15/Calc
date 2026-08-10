const display = document.getElementById("display");

let expression = "";
let justCalculated = false;

function render() {
    display.value = expression;
}

function append(value) {
    // After "=": typing a number starts a new calculation.
    if (justCalculated && !["+", "-", "*", "/"].includes(value)) {
        expression = "";
    }

    justCalculated = false;

    const operators = ["+", "-", "*", "/"];
    const lastChar = expression.slice(-1);

    // Prevent two operators in a row.
    if (operators.includes(value) && operators.includes(lastChar)) {
        expression = expression.slice(0, -1) + value;
    }

    // Only allow one decimal point per number.
    else if (value === ".") {
        const currentNumber = expression.split(/[+\-*/]/).pop();

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

function clearDisplay() {
    expression = "";
    justCalculated = false;
    render();
}

function deleteLast() {
    expression = expression.slice(0, -1);
    justCalculated = false;
    render();
}

function calculate() {
    if (!expression) return;

    // Don't calculate incomplete expressions.
    if (/[+\-*/.]$/.test(expression)) return;

    try {
        const tokens = expression.match(
            /(?:\d+(?:\.\d*)?|\.\d+)|[+\-*/]/g
        );

        if (!tokens || tokens.join("") !== expression) {
            throw new Error();
        }

        let result = Number(tokens[0]);

        if (!Number.isFinite(result)) {
            throw new Error();
        }

        for (let i = 1; i < tokens.length; i += 2) {
            const operator = tokens[i];
            const number = Number(tokens[i + 1]);

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
                    throw new Error("Cannot divide by zero");
                }

                result /= number;
            }
        }

        if (!Number.isFinite(result)) {
            throw new Error();
        }

        // Keep the result readable.
        expression = String(Number(result.toPrecision(12)));

        justCalculated = true;
        render();
    }

    catch {
        expression = "Error";
        justCalculated = true;
        render();
    }
}


// ================================
// KEYBOARD SUPPORT
// ================================

window.addEventListener("keydown", (event) => {

    const key = event.key;

    // Numbers + decimal
    if (/^[0-9.]$/.test(key)) {
        append(key);
    }

    // Operators
    else if (["+", "-", "*", "/"].includes(key)) {
        append(key);
    }

    // Enter / =
    else if (key === "Enter" || key === "=") {
        event.preventDefault();
        calculate();
    }

    // Backspace
    else if (key === "Backspace") {
        deleteLast();
    }

    // Escape / C
    else if (key === "Escape" || key.toLowerCase() === "c") {
        clearDisplay();
    }
});


// Initial display
render();