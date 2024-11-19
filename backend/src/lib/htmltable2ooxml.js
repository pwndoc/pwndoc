const { JSDOM } = require("jsdom");
const { Table, TableRow, TableCell, Paragraph, TextRun, WidthType } = require("docx");

// Function to normalize column widths to percentages
const normalizeWidthsToPercentages = (colWidths) => {
    const totalWidth = colWidths.reduce((sum, width) => sum + (width || 0), 0);
    return colWidths.map((width) => ((width || 0) / totalWidth) * 100);
};

// Function to parse an HTML table
const parseHtmlTable = (htmlTable) => {
    const dom = new JSDOM(htmlTable);
    const document = dom.window.document;

    // Extract column widths
    const colWidths = Array.from(document.querySelectorAll("col")).map((col) => {
        const colWidth = col.style.width || col.getAttribute("colwidth");
        return colWidth ? parseInt(colWidth.replace("px", ""), 10) : null;
    });

    // Normalize column widths to percentages
    const columnPercentages = normalizeWidthsToPercentages(colWidths.filter(Boolean));

    // Extract table rows and cells with formatting
    const rows = Array.from(document.querySelectorAll("table tr")).map((row) =>
        Array.from(row.querySelectorAll("th, td")).map((cell) => ({
            text: parseStyledText(cell),
            percentageWidth: columnPercentages[cell.cellIndex] || null,
        }))
    );

    return { rows, tablePercentage: 100, columnPercentages };
};

// Function to parse styled text (bold, italic, etc.)
const parseStyledText = (element) => {
    const children = Array.from(element.childNodes);
    return children
        .map((child) => {
            if (child.nodeType === 3) {
                // Text node
                return new TextRun({ text: child.textContent.trim() });
            } else if (child.nodeType === 1) {
                // Element node
                const tagName = child.tagName.toLowerCase();
                const textContent = child.textContent.trim();
                const styleOptions = { text: textContent };
                if (tagName === "b" || tagName === "strong") styleOptions.bold = true;
                if (tagName === "i" || tagName === "em") styleOptions.italic = true;
                if (tagName === "u") styleOptions.underline = {};
                return new TextRun(styleOptions);
            }
            return null;
        })
        .filter(Boolean); // Remove nulls
};

// Function to create a Word table
const createWordTable = (data) => {
    return new Table({
        rows: data.rows.map((row) =>
            new TableRow({
                children: row.map((cell) => {
                    const cellOptions = {
                        children: [new Paragraph({ children: cell.text })],
                    };
                    if (cell.percentageWidth !== null) {
                        cellOptions.width = {
                            size: cell.percentageWidth * 50, // Convert percentage to 1/50ths of a percent
                            type: WidthType.PERCENTAGE,
                        };
                    }
                    return new TableCell(cellOptions);
                }),
            })
        )
    });
};

const convertHTMLTableWord = (htmlTable) => {
    const tableData = parseHtmlTable(htmlTable);
    const table = createWordTable(tableData);
    return table;
}

module.exports = convertHTMLTableWord