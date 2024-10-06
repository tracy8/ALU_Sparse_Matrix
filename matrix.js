const fs = require('fs');

class SparseMatrix {
    constructor(rows, cols) {
        this.rows = rows;
        this.cols = cols;
        this.elements = new Map(); 
    }

    static fromFile(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.split('\n').map(line => line.trim());

            if (lines.length < 2) {
                throw new Error(`File ${filePath} does not contain enough lines for matrix dimensions`);
            }

            // Parsing dimensions
            const rowMatch = lines[0].match(/rows=(\d+)/);
            const colMatch = lines[1].match(/cols=(\d+)/);

            if (!rowMatch || !colMatch) {
                throw new Error(`Invalid dimension format in file ${filePath}. Expected 'rows=X' and 'cols=Y'`);
            }

            const totalRows = parseInt(rowMatch[1]);
            const totalCols = parseInt(colMatch[1]);
            const matrix = new SparseMatrix(totalRows, totalCols);

            // Parsing elements
            for (let i = 2; i < lines.length; i++) {
                const line = lines[i];
                if (!line) continue;

                const match = line.match(/\((\d+),\s*(\d+),\s*(-?\d+)\)/);
                if (!match) {
                    throw new Error(`Invalid format at line ${i + 1} in file ${filePath}: ${line}`);
                }

                const row = parseInt(match[1]);
                const col = parseInt(match[2]);
                const value = parseInt(match[3]);

                matrix.setElement(row, col, value);
            }

            return matrix;
        } catch (error) {
            if (error.code === 'ENOENT') {
                throw new Error(`File not found: ${filePath}`);
            }
            throw error;
        }
    }

    getElement(row, col) {
        return this.elements.get(`${row},${col}`) || 0;
    }

    setElement(row, col, value) {
        if (row >= this.rows) this.rows = row + 1;
        if (col >= this.cols) this.cols = col + 1;
        this.elements.set(`${row},${col}`, value);
    }

    add(other) {
        if (this.rows !== other.rows || this.cols !== other.cols) {
            throw new Error('Matrices must have the same dimensions for addition.');
        }

        const result = new SparseMatrix(this.rows, this.cols);

        // Adding elements from both matrices
        for (const [key, value] of this.elements) {
            const [row, col] = key.split(',').map(Number);
            result.setElement(row, col, value);
        }

        for (const [key, value] of other.elements) {
            const [row, col] = key.split(',').map(Number);
            const currentValue = result.getElement(row, col);
            result.setElement(row, col, currentValue + value);
        }

        return result;
    }

    subtract(other) {
        if (this.rows !== other.rows || this.cols !== other.cols) {
            throw new Error('Matrices must have the same dimensions for subtraction.');
        }

        const result = new SparseMatrix(this.rows, this.cols);

        // Adding elements from first matrix
        for (const [key, value] of this.elements) {
            const [row, col] = key.split(',').map(Number);
            result.setElement(row, col, value);
        }

        // Subtracting elements from second matrix
        for (const [key, value] of other.elements) {
            const [row, col] = key.split(',').map(Number);
            const currentValue = result.getElement(row, col);
            result.setElement(row, col, currentValue - value);
        }

        return result;
    }

    multiply(other) {
        if (this.cols !== other.rows) {
            throw new Error('Number of columns of first matrix must equal number of rows of second matrix.');
        }

        const result = new SparseMatrix(this.rows, other.cols);

        // Multiplying matrices
        for (const [key1, value1] of this.elements) {
            const [row, col] = key1.split(',').map(Number);
            for (let k = 0; k < other.cols; k++) {
                const otherValue = other.getElement(col, k);
                if (otherValue !== 0) {
                    const currentValue = result.getElement(row, k);
                    result.setElement(row, k, currentValue + value1 * otherValue);
                }
            }
        }

        return result;
    }

    toString() {
        let result = `rows=${this.rows}\ncols=${this.cols}\n`;
        for (const [key, value] of this.elements) {
            const [row, col] = key.split(',');
            result += `(${row}, ${col}, ${value})\n`;
        }
        return result.trim();
    }

    saveToFile(filePath) {
        fs.writeFileSync(filePath, this.toString());
    }
}

async function performCalculations() {
    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const question = (query) => new Promise((resolve) => readline.question(query, resolve));

    try {
        const operations = {
            '1': { name: 'addition', method: 'add' },
            '2': { name: 'subtraction', method: 'subtract' },
            '3': { name: 'multiplication', method: 'multiply' }
        };

        // Displaying operations menu
        console.log('Available operations:');
        Object.entries(operations).forEach(([key, op]) => {
            console.log(`${key}: ${op.name}`);
        });

        // Geting user input
        const matrix1Path = await question('Enter the file path for the first matrix: ');
        const matrix1 = SparseMatrix.fromFile(matrix1Path);
        console.log('First matrix loading........\n');

        const matrix2Path = await question('Enter the file path for the second matrix: ');
        const matrix2 = SparseMatrix.fromFile(matrix2Path);
        console.log('Second matrix loading.......\n');

        const operationChoice = await question('Choose an operation (1, 2, or 3): ');
        const operation = operations[operationChoice];

        if (!operation) {
            throw new Error('Invalid operation choice.');
        }

        const resultMatrix = matrix1[operation.method](matrix2);
        console.log(`Output of ${operation.name}........\n`);

        const outputPath = await question('Enter the file path to save the result: ');
        resultMatrix.saveToFile(outputPath);
        console.log(`Output file saved to ${outputPath}`);

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        readline.close();
    }
}

performCalculations();