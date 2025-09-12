"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const path = require("path");
const goTestProvider_1 = require("./goTestProvider");
const testUtil_1 = require("./lib/testUtil");
const testNode_1 = require("./testNode");
const commands_1 = require("./commands");
const testResult_1 = require("./testResult");
const testDiscovery_1 = require("./testDiscovery");
const config_1 = require("./config");
class GoTestExplorer {
    constructor(context) {
        this.count = 0;
        this.commands = new commands_1.Commands();
        this.testBuffer = [];
        this.goTestProvider = new goTestProvider_1.GoTestProvider(context, this.commands);
        const testDiscoverer = new testDiscovery_1.TestDiscovery(this.commands);
        vscode.window.registerTreeDataProvider('goTestExplorer', this.goTestProvider);
        context.subscriptions.push(vscode.commands.registerCommand('goTestExplorer.runTest', this.onRunSingleTest.bind(this)));
        context.subscriptions.push(vscode.commands.registerCommand("goTestExplorer.runAllTest", this.onRunAllTests.bind(this)));
        context.subscriptions.push(vscode.commands.registerCommand("goTestExplorer.refreshTestExplorer", () => {
            testDiscoverer.discoverAllTests();
        }));
        context.subscriptions.push(vscode.commands.registerCommand("goTestExplorer.showTestoutput", (testNode) => {
            let output = testNode.testResult && testNode.testResult.output && testNode.testResult.output.length > 0 ? testNode.testResult.output.join("\n") : "No output";
            vscode.window.showInformationMessage(output);
        }));
        context.subscriptions.push(vscode.commands.registerCommand("goTestExplorer.goToLocation", this.go.bind(this)));
        context.subscriptions.push(vscode.commands.registerCommand('goTestExplorer.runTestSuite', this.runTestSuite.bind(this)));
        context.subscriptions.push(this.commands.testCompleted(this.onTestCompleted, this));
        testDiscoverer.discoverAllTests();
    }
    onRunSingleTest(testNode) {
        return __awaiter(this, void 0, void 0, function* () {
            this.commands.sendTestRunStarted(testNode);
            const testConfig = this.buildTestConfig(testNode);
            const testSuite = new testNode_1.TestNode(testConfig.testName, testConfig.testUri);
            this.commands.sendTestRunStarted(testSuite);
            this.pushToBuffer(testConfig);
        });
    }
    runTestSuite(testNode) {
        if (testNode.children.length === 0) {
            return;
        }
        testNode.children.forEach(t => this.commands.sendTestRunStarted(t));
        this.commands.sendTestRunStarted(testNode);
        const testConfig = this.buildTestConfig(testNode);
        this.pushToBuffer(testConfig);
    }
    onRunAllTests() {
        this.goTestProvider.discoveredTests.
            filter(s => s.isTestSuite).
            forEach(t => this.runTestSuite(t));
    }
    buildTestConfig(testNode) {
        let tests = testNode.children.map(node => node.name);
        tests = tests.length > 0 ? tests : [testNode.name];
        const testConfig = {
            dir: path.dirname(testNode.uri.fsPath),
            goConfig: vscode.workspace.getConfiguration('go', testNode.uri),
            flags: [""],
            functions: tests,
            testUri: testNode.uri,
            testName: path.basename(testNode.uri.fsPath)
        };
        return testConfig;
    }
    pushToBuffer(testConfig) {
        this.testBuffer.push(testConfig);
        this.processTestBuffer();
    }
    processTestBuffer() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.testBuffer.length <= 0 || this.count > config_1.Config.RunMaxParallelTest) {
                return;
            }
            const testConfig = this.testBuffer.shift();
            this.count++;
            const result = yield testUtil_1.runGoTest(testConfig);
            this.count--;
            let isTestSuitePassed = true;
            testConfig.functions.forEach(t => {
                let isTestPassed = true;
                if (result.isPassed === false && (!result.failedTests || result.failedTests.length === 0 || result.failedTests.indexOf(t) !== -1)) {
                    isTestPassed = false;
                    isTestSuitePassed = false;
                }
                this.commands.sendTestResult(new testResult_1.TestResult(testConfig.testUri, t, isTestPassed, result.output, result.err));
            });
            this.commands.sendTestResult(new testResult_1.TestResult(testConfig.testUri, testConfig.testName, isTestSuitePassed, result.output, result.err));
            this.commands.sendTestCompleted();
        });
    }
    onTestCompleted() {
        this.processTestBuffer();
    }
    go(testNode) {
        return __awaiter(this, void 0, void 0, function* () {
            const symbols = yield testUtil_1.getTestFunctions(testNode.uri, null);
            try {
                const symbol = this.findTestLocation(symbols, testNode);
                const doc = yield vscode.workspace.openTextDocument(testNode.uri); //.then((doc) => {
                // const byteOffsetToDocumentOffset = makeMemoizedByteOffsetConverter(new Buffer(doc.getText()));
                // let start =byteOffsetToDocumentOffset(998 - 1);
                // let end = byteOffsetToDocumentOffset(1057 - 1);
                yield vscode.window.showTextDocument(doc); //.then((editor) => {
                // const loc = new vscode.Range(doc.positionAt(start), doc.positionAt(end));
                const loc = symbol.location.range;
                const selection = new vscode.Selection(loc.start.line, loc.start.character, loc.end.line, loc.end.character);
                vscode.window.activeTextEditor.selection = selection;
                vscode.window.activeTextEditor.revealRange(selection, vscode.TextEditorRevealType.InCenter);
            }
            catch (r) {
                vscode.window.showWarningMessage(r.message);
            }
        });
    }
    findTestLocation(symbols, testNode) {
        if (symbols.length === 0) {
            throw new Error("Could not find test (no symbols found)");
        }
        const testName = testNode.name;
        symbols = symbols.filter((s) => s.kind === vscode.SymbolKind.Function && s.name === testName);
        if (symbols.length === 0) {
            throw Error("Could not find test (no symbols matching)");
        }
        if (symbols.length > 1) {
            throw Error("Could not find test (found multiple matching symbols)");
        }
        return symbols[0];
    }
}
exports.GoTestExplorer = GoTestExplorer;
//# sourceMappingURL=goTestExplorer.js.map