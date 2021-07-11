import { readFileSync } from 'fs';
import * as vscode from 'vscode';

export class DartImportSorter {
	private packageName: String = '';

	public async initialize(): Promise<void> {
		this.packageName = (await this.findPackageName()) ?? '';
	}

	public handleSortCommand(): void {
		this.sortImports();
	}

	public handleOnWillSaveTextDocument(event: vscode.TextDocumentWillSaveEvent): void {}

	private async findPackageName(): Promise<string | undefined> {
		const pubspecs = await vscode.workspace.findFiles('pubspec.yaml');
		if (!pubspecs.length) {
			vscode.window.showInformationMessage(`!pubspecs.length`);
			return;
		}

		const pubspec = pubspecs[0];
		const content = await readFileSync(pubspec.fsPath, 'utf8');
		if (!content) {
			vscode.window.showInformationMessage(`!content`);
			return;
		}

		const regex = /^name:.*\n/g;
		const match = content.match(regex);
		if (!match) {
			return;
		}
		return match.toString().replace('name:', '').trim();
	}

	private sortImports(): void {
		const result = this.readImports();
		if (!result) {
			return;
		}

		const [imports, range] = result;
		const organizedImports = this.getImports(imports);
		vscode.window.createOutputChannel('sort imports').append(`${organizedImports.join('\n')}`);
	}

	private readImports(): [string[], vscode.Range] | undefined {
		const editor = vscode.window.activeTextEditor;
		const text = editor?.document?.getText();
		if (!text) {
			return;
		}

		const isBlank = (text: string): boolean => !text || /^\s*$/.test(text);

		let imports: string[] = [];
		let startLine: number | undefined, endLine: number | undefined;

		const lines = text.split('\n');
		for (let index = 0; index < lines.length; index++) {
			const line = lines[index].trim();
			const isLast = index === lines.length - 1;

			if (line.startsWith('import') || line.startsWith('export') || line.startsWith('part')) {
				imports.push(line);
				if (!startLine) {
					startLine = index;
				}

				if (isLast) {
					endLine = index;
				}
			} else if (isLast || (!isBlank(line) && !line.startsWith('library') && !line.startsWith('//'))) {
				if (startLine) {
					if (index > 0 && isBlank(lines[index - 1])) {
						endLine = index - 1;
					} else {
						endLine = index;
					}
				}
				break;
			}
		}

		if (!imports?.length) {
			return;
		}

		return [imports, new vscode.Selection(new vscode.Position(startLine!, 0), new vscode.Position(endLine!, 0))];
	}

	private getImports(rawImports: string[]): string[] {
		let dartImports = <string[]>[];
		let packageImports = <string[]>[];
		let packageLocalImports = <string[]>[];
		let relativeImports = <string[]>[];
		let partStatements = <string[]>[];
		let exportStatements = <string[]>[];

		let result = <string[]>[];

		const addImports = (imports: string[]) => {
			const sortedImports = imports.sort();
			result.push(...sortedImports);
			result.push('\n');
		};

		// Get this from preferences
		const arePackageLocalImportsSeparated = true;

		rawImports.forEach((value) => {
			if (value.startsWith('export')) {
				exportStatements.push(value);
			} else if (value.startsWith('part')) {
				partStatements.push(value);
			} else if (arePackageLocalImportsSeparated && this.packageName && value.includes(`package:${this.packageName}`)) {
				packageLocalImports.push(value);
			} else if (value.includes('package:')) {
				packageImports.push(value);
			} else {
				relativeImports.push(value);
			}
		});

		addImports(dartImports);
		addImports(packageImports);
		addImports(packageLocalImports);
		addImports(relativeImports);
		addImports(partStatements);
		addImports(exportStatements);

		// Remove the redundant new line added by `addImports`.
		result.pop();

		return result;
	}
}
