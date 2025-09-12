"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
let toolsGopath;
const vscode = require("vscode");
const path = require("path");
const os = require("os");
const goPath_1 = require("./goPath");
const avlTree_1 = require("./avlTree");
function getToolsGopath(useCache = true) {
    if (!useCache || !toolsGopath) {
        toolsGopath = resolveToolsGopath();
    }
    return toolsGopath;
}
exports.getToolsGopath = getToolsGopath;
function resolveToolsGopath() {
    let toolsGopathForWorkspace = vscode.workspace.getConfiguration('go')['toolsGopath'] || '';
    // In case of single root, use resolvePath to resolve ~ and ${workspaceRoot}
    if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length <= 1) {
        return resolvePath(toolsGopathForWorkspace);
    }
    // In case of multi-root, resolve ~ and ignore ${workspaceRoot}
    if (toolsGopathForWorkspace.startsWith('~')) {
        toolsGopathForWorkspace = path.join(os.homedir(), toolsGopathForWorkspace.substr(1));
    }
    if (toolsGopathForWorkspace && toolsGopathForWorkspace.trim() && !/\${workspaceRoot}/.test(toolsGopathForWorkspace)) {
        return toolsGopathForWorkspace;
    }
    // If any of the folders in multi root have toolsGopath set, use it.
    for (let i = 0; i < vscode.workspace.workspaceFolders.length; i++) {
        let toolsGopath = vscode.workspace.getConfiguration('go', vscode.workspace.workspaceFolders[i].uri).inspect('toolsGopath').workspaceFolderValue;
        toolsGopath = resolvePath(toolsGopath, vscode.workspace.workspaceFolders[i].uri.fsPath);
        if (toolsGopath) {
            return toolsGopath;
        }
    }
}
/**
 * Exapnds ~ to homedir in non-Windows platform and resolves ${workspaceRoot}
 */
function resolvePath(inputPath, workspaceRoot) {
    if (!inputPath || !inputPath.trim())
        return inputPath;
    if (!workspaceRoot && vscode.workspace.workspaceFolders) {
        if (vscode.workspace.workspaceFolders.length === 1) {
            workspaceRoot = vscode.workspace.rootPath;
        }
        else if (vscode.window.activeTextEditor && vscode.workspace.getWorkspaceFolder(vscode.window.activeTextEditor.document.uri)) {
            workspaceRoot = vscode.workspace.getWorkspaceFolder(vscode.window.activeTextEditor.document.uri).uri.fsPath;
        }
    }
    if (workspaceRoot) {
        inputPath = inputPath.replace(/\${workspaceRoot}/g, workspaceRoot).replace(/\${workspaceFolder}/g, workspaceRoot);
    }
    return resolveHomeDir(inputPath);
}
exports.resolvePath = resolvePath;
/**
 * Exapnds ~ to homedir in non-Windows platform
 */
function resolveHomeDir(inputPath) {
    if (!inputPath || !inputPath.trim())
        return inputPath;
    return inputPath.startsWith('~') ? path.join(os.homedir(), inputPath.substr(1)) : inputPath;
}
exports.resolveHomeDir = resolveHomeDir;
function killProcess(p) {
    if (p) {
        try {
            p.kill();
        }
        catch (e) {
            console.log('Error killing process: ' + e);
        }
    }
}
exports.killProcess = killProcess;
function getTestEnvVars(config) {
    const envVars = getToolsEnvVars();
    const testEnvConfig = config['testEnvVars'] || {};
    let fileEnv = {};
    let testEnvFile = config['testEnvFile'];
    if (testEnvFile) {
        testEnvFile = resolvePath(testEnvFile);
        try {
            fileEnv = goPath_1.parseEnvFile(testEnvFile);
        }
        catch (e) {
            console.log(e);
        }
    }
    Object.keys(fileEnv).forEach(key => envVars[key] = typeof fileEnv[key] === 'string' ? resolvePath(fileEnv[key]) : fileEnv[key]);
    Object.keys(testEnvConfig).forEach(key => envVars[key] = typeof testEnvConfig[key] === 'string' ? resolvePath(testEnvConfig[key]) : testEnvConfig[key]);
    return envVars;
}
exports.getTestEnvVars = getTestEnvVars;
function getToolsEnvVars() {
    const config = vscode.workspace.getConfiguration('go', vscode.window.activeTextEditor ? vscode.window.activeTextEditor.document.uri : null);
    const toolsEnvVars = config['toolsEnvVars'];
    const gopath = getCurrentGoPath();
    const envVars = Object.assign({}, process.env, gopath ? { GOPATH: gopath } : {});
    if (toolsEnvVars && typeof toolsEnvVars === 'object') {
        Object.keys(toolsEnvVars).forEach(key => envVars[key] = typeof toolsEnvVars[key] === 'string' ? resolvePath(toolsEnvVars[key]) : toolsEnvVars[key]);
    }
    // cgo expects go to be in the path
    const goroot = envVars['GOROOT'];
    let pathEnvVar;
    if (envVars.hasOwnProperty('PATH')) {
        pathEnvVar = 'PATH';
    }
    else if (process.platform === 'win32' && envVars.hasOwnProperty('Path')) {
        pathEnvVar = 'Path';
    }
    if (goroot && pathEnvVar && envVars[pathEnvVar] && envVars[pathEnvVar].split(path.delimiter).indexOf(goroot) === -1) {
        envVars[pathEnvVar] += path.delimiter + path.join(goroot, 'bin');
    }
    return envVars;
}
exports.getToolsEnvVars = getToolsEnvVars;
function stripBOM(s) {
    if (s && s[0] === '\uFEFF') {
        s = s.substr(1);
    }
    return s;
}
exports.stripBOM = stripBOM;
function getCurrentGoPath(workspaceUri) {
    const config = vscode.workspace.getConfiguration('go', workspaceUri);
    let currentRoot = workspaceUri ? workspaceUri.fsPath : vscode.workspace.rootPath;
    const configGopath = config['gopath'] ? resolvePath(config['gopath'], currentRoot) : '';
    return (configGopath || process.env['GOPATH']);
}
exports.getCurrentGoPath = getCurrentGoPath;
function promptForMissingTool(tool) {
    vscode.window.showInformationMessage(`${tool} is missing`);
}
exports.promptForMissingTool = promptForMissingTool;
function getFileArchive(document) {
    let fileContents = document.getText();
    return document.fileName + '\n' + Buffer.byteLength(fileContents, 'utf8') + '\n' + fileContents;
}
exports.getFileArchive = getFileArchive;
function makeMemoizedByteOffsetConverter(buffer) {
    let defaultValue = new avlTree_1.Node(0, 0); // 0 bytes will always be 0 characters
    let memo = new avlTree_1.NearestNeighborDict(defaultValue, avlTree_1.NearestNeighborDict.NUMERIC_DISTANCE_FUNCTION);
    return (byteOffset) => {
        let nearest = memo.getNearest(byteOffset);
        let byteDelta = byteOffset - nearest.key;
        if (byteDelta === 0)
            return nearest.value;
        let charDelta;
        if (byteDelta > 0)
            charDelta = buffer.toString('utf8', nearest.key, byteOffset).length;
        else
            charDelta = -buffer.toString('utf8', byteOffset, nearest.key).length;
        memo.insert(byteOffset, nearest.value + charDelta);
        return nearest.value + charDelta;
    };
}
exports.makeMemoizedByteOffsetConverter = makeMemoizedByteOffsetConverter;
class LineBuffer {
    constructor() {
        this.buf = '';
        this.lineListeners = [];
        this.lastListeners = [];
    }
    append(chunk) {
        this.buf += chunk;
        do {
            const idx = this.buf.indexOf('\n');
            if (idx === -1) {
                break;
            }
            this.fireLine(this.buf.substring(0, idx));
            this.buf = this.buf.substring(idx + 1);
        } while (true);
    }
    done() {
        this.fireDone(this.buf !== '' ? this.buf : null);
    }
    fireLine(line) {
        this.lineListeners.forEach(listener => listener(line));
    }
    fireDone(last) {
        this.lastListeners.forEach(listener => listener(last));
    }
    onLine(listener) {
        this.lineListeners.push(listener);
    }
    onDone(listener) {
        this.lastListeners.push(listener);
    }
}
exports.LineBuffer = LineBuffer;
//# sourceMappingURL=utils.js.map