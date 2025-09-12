"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
class Commands {
    constructor() {
        this.onTestDiscoveryFinishedEmitter = new vscode_1.EventEmitter();
        this.onTestDiscoveryStartedEmitter = new vscode_1.EventEmitter();
        this.onTestRunStartedEmitter = new vscode_1.EventEmitter();
        this.onTestResultEmitter = new vscode_1.EventEmitter();
        this.onTestCompletedEmitter = new vscode_1.EventEmitter();
    }
    get discoveredTest() {
        return this.onTestDiscoveryFinishedEmitter.event;
    }
    sendDiscoveredTests(testNodeList) {
        this.onTestDiscoveryFinishedEmitter.fire(testNodeList);
    }
    get testDiscoveryStarted() {
        return this.onTestDiscoveryStartedEmitter.event;
    }
    sendTestDiscoveryStarted() {
        this.onTestDiscoveryStartedEmitter.fire();
    }
    get testRunStarted() {
        return this.onTestRunStartedEmitter.event;
    }
    sendTestRunStarted(testNode) {
        this.onTestRunStartedEmitter.fire(testNode);
    }
    get testResult() {
        return this.onTestResultEmitter.event;
    }
    sendTestResult(testResult) {
        this.onTestResultEmitter.fire(testResult);
    }
    get testCompleted() {
        return this.onTestCompletedEmitter.event;
    }
    sendTestCompleted() {
        this.onTestCompletedEmitter.fire();
    }
}
exports.Commands = Commands;
//# sourceMappingURL=commands.js.map