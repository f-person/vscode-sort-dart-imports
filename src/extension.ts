import * as vscode from 'vscode';
import { DartImportSorter } from './core/dart-import-sorter';

export async function activate(context: vscode.ExtensionContext) {
	const dartImportSorter = new DartImportSorter();
	await dartImportSorter.initialize();

	const sortImportsCommand = vscode.commands.registerCommand('sort-dart-imports.sort', () =>
		dartImportSorter.handleSortCommand()
	);
	const onWillSaveTextDocument = vscode.workspace.onWillSaveTextDocument(dartImportSorter.handleOnWillSaveTextDocument);

	context.subscriptions.push(sortImportsCommand);
	context.subscriptions.push(onWillSaveTextDocument);
}

// this method is called when your extension is deactivated
export function deactivate() {}
