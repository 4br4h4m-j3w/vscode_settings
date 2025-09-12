"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const path = require("path");
const testNode_1 = require("./testNode");
class GoTestProvider {
    constructor(context, commands) {
        this.context = context;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        context.subscriptions.push(commands.discoveredTest(this.onDicoveredTest, this));
        context.subscriptions.push(commands.testDiscoveryStarted(this.onDiscoverTestStart, this));
        context.subscriptions.push(commands.testResult(this.updateTestResult, this));
        context.subscriptions.push(commands.testRunStarted(this.onTestRunStarted, this));
    }
    refresh(testNode) {
        this._onDidChangeTreeData.fire(testNode);
    }
    getTreeItem(testNode) {
        const treeItem = new vscode.TreeItem(testNode.name, testNode.isTestSuite ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None);
        treeItem.contextValue = this._discovering ? 'discovering' : testNode.isTestSuite ? 'testSuite' : 'test';
        if (!testNode.isTestSuite) {
            treeItem.command = {
                command: 'goTestExplorer.goToLocation',
                title: testNode.tooltip,
                arguments: [testNode]
            };
        }
        treeItem.iconPath = {
            dark: this.context.asAbsolutePath(path.join("resources", "dark", testNode.icon)),
            light: this.context.asAbsolutePath(path.join("resources", "light", testNode.icon))
        };
        return treeItem;
    }
    getChildren(testNode) {
        if (testNode) {
            return Promise.resolve(testNode.children);
        }
        if (this._discovering) {
            return Promise.resolve([new testNode_1.TestNode("Loading...", null)]);
        }
        return Promise.resolve(this._discoveredTests);
    }
    get discoveredTests() {
        return this._discoveredTests;
    }
    getDiscoveredTestNode(key) {
        return this.__discoveredTestsMap.get(key);
    }
    updateTestResult(testResult) {
        let testNode = this.__discoveredTestsMap.get(this.getNodeKey(testResult.uri.fsPath, testResult.testName));
        if (testNode) {
            testNode.testResult = testResult;
        }
        this.refresh(testNode);
    }
    onDiscoverTestStart() {
        this._discoveredTests = [];
        this._discovering = true;
        this.refresh();
    }
    onDicoveredTest(testNodeList) {
        this._discoveredTests = testNodeList && testNodeList.length > 0 ? testNodeList : [];
        this.__discoveredTestsMap = new Map();
        this._discoveredTests.forEach(x => {
            if (x.isTestSuite) {
                x.children.forEach(node => {
                    this.__discoveredTestsMap.set(this.getNodeKey(node.uri.fsPath, node.name), node);
                });
                this.__discoveredTestsMap.set(x.uri.fsPath, x);
            }
            else {
                this.__discoveredTestsMap.set(this.getNodeKey(x.uri.fsPath, x.name), x);
            }
        });
        this._discovering = false;
        this.refresh();
    }
    onTestRunStarted(testNode) {
        testNode ? this.setLoading(testNode) : this.setAlloading();
    }
    setLoading(testNode) {
        let tempNode = this.__discoveredTestsMap.get(this.getNodeKey(testNode.uri.fsPath, testNode.name));
        if (tempNode) {
            tempNode.setLoading();
        }
        this.refresh(tempNode);
    }
    setAlloading() {
        this.discoveredTests.
            filter(s => s.isTestSuite).
            forEach(s => s.children.forEach(t => t.setLoading()));
        this.refresh();
    }
    getNodeKey(uri, nodeName) {
        return uri + "__" + nodeName;
    }
}
exports.GoTestProvider = GoTestProvider;
//# sourceMappingURL=goTestProvider.js.map