import { commands, Disposable, ExtensionContext, window, workspace } from 'vscode';
import { DartImportSorter } from './core/dart-import-sorter';

export async function activate(context: ExtensionContext) {
	const dartImportSorter = new DartImportSorter();
	await dartImportSorter.initialize();

	const sortImportsCommand: Disposable = commands.registerCommand(
		'sort-dart-imports.sort',
		dartImportSorter.handleSortCommand
	);

	const onWillSaveTextDocument = workspace.onWillSaveTextDocument(dartImportSorter.handleOnWillSaveTextDocument);

	context.subscriptions.push(sortImportsCommand);
	context.subscriptions.push(onWillSaveTextDocument);
}

// this method is called when your extension is deactivated
export function deactivate() {}
