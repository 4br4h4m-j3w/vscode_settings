'use strict';
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
const cp = require("child_process");
const testUtil_1 = require("./testUtil");
const utils_1 = require("./utils");
function documentSymbols(options, token) {
    return new Promise((resolve, reject) => {
        let gooutline = testUtil_1.getBinPath('go-outline');
        let gooutlineFlags = ['-f', options.fileName];
        if (options.importsOnly) {
            gooutlineFlags.push('-imports-only');
        }
        if (options.document) {
            gooutlineFlags.push('-modified');
        }
        let p;
        if (token) {
            token.onCancellationRequested(() => utils_1.killProcess(p));
        }
        // Spawn `go-outline` process
        p = cp.execFile(gooutline, gooutlineFlags, { env: utils_1.getToolsEnvVars() }, (err, stdout, stderr) => {
            try {
                if (err && err.code === 'ENOENT') {
                    utils_1.promptForMissingTool('go-outline');
                }
                if (stderr && stderr.startsWith('flag provided but not defined: ')) {
                    //	promptForUpdatingTool('go-outline');
                    if (stderr.startsWith('flag provided but not defined: -imports-only')) {
                        options.importsOnly = false;
                    }
                    if (stderr.startsWith('flag provided but not defined: -modified')) {
                        options.document = null;
                    }
                    p = null;
                    return documentSymbols(options, token).then(results => {
                        return resolve(results);
                    });
                }
                if (err)
                    return resolve(null);
                let result = stdout.toString();
                let decls = JSON.parse(result);
                return resolve(decls);
            }
            catch (e) {
                reject(e);
            }
        });
        if (options.document && p.pid) {
            p.stdin.end(utils_1.getFileArchive(options.document));
        }
    });
}
exports.documentSymbols = documentSymbols;
class GoDocumentSymbolProvider {
    constructor() {
        this.goKindToCodeKind = {
            'package': vscode.SymbolKind.Package,
            'import': vscode.SymbolKind.Namespace,
            'variable': vscode.SymbolKind.Variable,
            'type': vscode.SymbolKind.Interface,
            'function': vscode.SymbolKind.Function
        };
    }
    convertToCodeSymbols(uri, document, decls, symbols, containerName, byteOffsetToDocumentOffset) {
        let gotoSymbolConfig = vscode.workspace.getConfiguration('go', uri)['gotoSymbol'];
        let includeImports = gotoSymbolConfig ? gotoSymbolConfig['includeImports'] : false;
        (decls || []).forEach(decl => {
            if (!includeImports && decl.type === 'import')
                return;
            let label = decl.label;
            if (label === '_' && decl.type === 'variable')
                return;
            if (decl.receiverType) {
                label = '(' + decl.receiverType + ').' + label;
            }
            let start = byteOffsetToDocumentOffset(decl.start - 1);
            let end = byteOffsetToDocumentOffset(decl.end - 1);
            let symbolInfo = new vscode.SymbolInformation(label, this.goKindToCodeKind[decl.type], 
            //	null,
            new vscode.Range(document.positionAt(start), document.positionAt(end)), uri, containerName);
            symbols.push(symbolInfo);
            if (decl.children) {
                this.convertToCodeSymbols(uri, document, decl.children, symbols, decl.label, byteOffsetToDocumentOffset);
            }
        });
    }
    provideDocumentSymbols(uri, token) {
        let options = { fileName: uri.fsPath };
        return documentSymbols(options, token).then((decls) => __awaiter(this, void 0, void 0, function* () {
            let symbols = [];
            //let document: vscode.TextDocument
            let document = yield vscode.workspace.openTextDocument(uri);
            this.convertToCodeSymbols(uri, document, decls, symbols, '', utils_1.makeMemoizedByteOffsetConverter(new Buffer(document.getText())));
            return symbols;
        }));
    }
}
exports.GoDocumentSymbolProvider = GoDocumentSymbolProvider;
//# sourceMappingURL=goOutline.js.map