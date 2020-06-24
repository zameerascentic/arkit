"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !exports.hasOwnProperty(p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllStatements = exports.convertToRelative = exports.getAbsolute = exports.getAllComponents = exports.request = exports.bold = exports.verifyComponentFilters = exports.array = exports.safeRequire = exports.find = exports.nameMatch = exports.match = exports.getPaths = exports.getMemoryUsage = exports.getStats = void 0;
const path = require("path");
const fs = require("fs");
const logger_1 = require("./logger");
const nanomatch = require("nanomatch");
const https = require("https");
const ts_morph_1 = require("ts-morph");
__exportStar(require("./logger"), exports);
exports.getStats = (path) => {
    try {
        const stats = fs.statSync(path);
        return {
            isDirectory: stats.isDirectory(),
            isFile: stats.isFile(),
        };
    }
    catch (e) {
        logger_1.warn(e);
        return {
            isDirectory: false,
            isFile: false,
        };
    }
};
exports.getMemoryUsage = () => {
    const memoryUsage = process.memoryUsage();
    return memoryUsage.heapUsed / memoryUsage.heapTotal;
};
exports.getPaths = (mainDirectory, directory, includePatterns, excludePatterns, history = [], targetFolders = [], targetFilenames = []) => {
    const root = path.join(mainDirectory, directory);
    if (history.includes(root)) {
        logger_1.warn(`Skipping ${root} as it was parsed already`);
        return [];
    }
    else {
        history.push(root);
    }
    const usedMemory = exports.getMemoryUsage();
    if (usedMemory > 0.95) {
        logger_1.warn(`Stopping at ${root} since 95% of heap memory is used!`);
        return [];
    }
    return fs.readdirSync(root).reduce((suitablePaths, fileName) => {
        const filePath = path.join(directory, fileName);
        const notExcluded = !excludePatterns.length || !exports.match(filePath, excludePatterns);
        if (notExcluded) {
            const fullPath = path.join(root, fileName);
            const stats = exports.getStats(fullPath);
            const isIncluded = exports.match(filePath, includePatterns);
            console.log("dir check");
            console.log(fileName);
            console.log(targetFolders && targetFolders.indexOf(fileName) > -1);
            console.log("file check");
            console.log(fileName);
            console.log(targetFilenames && targetFilenames.indexOf(fileName) > -1);
            if ((targetFolders &&
                targetFolders.indexOf(fileName) > -1 &&
                stats.isDirectory) ||
                (targetFolders.length === 0 && stats.isDirectory)) {
                if (isIncluded) {
                    suitablePaths.push(path.join(fullPath, "**"));
                }
                else {
                    const childPaths = exports.getPaths(mainDirectory, filePath, includePatterns, excludePatterns, history, targetFolders, targetFilenames);
                    suitablePaths.push(...childPaths);
                }
            }
            else if ((targetFilenames &&
                targetFilenames.indexOf(fileName) > -1 &&
                stats.isFile &&
                isIncluded) ||
                (targetFilenames.length === 0 && stats.isFile && isIncluded)) {
                suitablePaths.push(fullPath);
            }
        }
        return suitablePaths;
    }, []);
};
exports.match = (filepath, patterns) => {
    return !patterns || !patterns.length || nanomatch.some(filepath, patterns);
};
exports.nameMatch = (filepath, patterns) => {
    return !patterns || !patterns.length || nanomatch.some(filepath, patterns);
};
exports.find = (filepath, patterns) => {
    return patterns.find((pattern) => nanomatch(filepath, pattern).length);
};
exports.safeRequire = (path) => {
    try {
        return require(path);
    }
    catch (e) {
        logger_1.trace(e.toString());
    }
};
exports.array = (input) => {
    if (input) {
        return [].concat(input);
    }
};
exports.verifyComponentFilters = (filters, component, mainDirectory) => {
    const matchesPatterns = !("filename" in component) ||
        exports.match(path.relative(mainDirectory, component.filename), filters.patterns);
    const matchesComponents = !filters.components ||
        filters.components.some((type) => type === component.type);
    return matchesPatterns && matchesComponents;
};
exports.bold = (str) => {
    return `<b>${str}</b>`;
};
exports.request = (path, payload) => {
    return new Promise((resolve, reject) => {
        const req = https
            .request({
            path,
            hostname: "arkit.pro",
            port: 443,
            method: "post",
            headers: {
                "Content-Type": "text/plain",
                "Content-Length": payload.length,
            },
        }, (res) => {
            const data = [];
            res.on("data", (chunk) => data.push(chunk));
            res.on("end", () => {
                resolve(Buffer.concat(data));
            });
        })
            .on("error", (err) => {
            reject(err);
        });
        req.write(payload);
        req.end();
    });
};
exports.getAllComponents = (layers, sortByName = false) => {
    const components = [].concat(...[...layers.values()].map((components) => [...components]));
    if (sortByName) {
        components.sort((a, b) => a.name.localeCompare(b.name));
    }
    return components;
};
exports.getAbsolute = (filepath, root = process.cwd()) => {
    return !path.isAbsolute(filepath) ? path.resolve(root, filepath) : filepath;
};
exports.convertToRelative = (paths, root, excludes = []) => {
    return paths.map((filepath) => {
        if (excludes.includes(filepath)) {
            return filepath;
        }
        return path.relative(root, exports.getAbsolute(filepath));
    });
};
exports.getAllStatements = (nodes, statements = []) => {
    return nodes.reduce((statements, node) => {
        try {
            const children = node.getChildren();
            if (ts_morph_1.TypeGuards.isStatement(node) || ts_morph_1.TypeGuards.isImportTypeNode(node)) {
                statements.push(node);
            }
            exports.getAllStatements(children, statements);
        }
        catch (e) {
            logger_1.warn(e);
        }
        return statements;
    }, statements);
};
