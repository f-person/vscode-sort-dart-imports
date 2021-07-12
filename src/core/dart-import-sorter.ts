import { readFileSync } from 'fs';
import * as vscode from 'vscode';

type ImportEntry = {
	content: string;
	comments: string[];
};

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
			return;
		}

		const pubspec = pubspecs[0];
		const content = await readFileSync(pubspec.fsPath, 'utf8');
		if (!content) {
			return;
		}

		const regex = /^name:.*\n/g;
		const match = content.match(regex);
		if (!match) {
			return;
		}
		return match.toString().replace('name:', '').trim();
	}
	private isBlank(text: string): boolean {
		return !text || /^\s*$/.test(text);
	}

	private sortImports(): void {
		const result = this.readImports();
		if (!result) {
			return;
		}

		const [imports, range] = result;
		const organizedImports = this.getImports(imports);
		let organizedImportsString = '';
		organizedImports.forEach((entry) => {
			if (entry.comments.length) {
				organizedImportsString += entry.comments.join('\n');
				organizedImportsString += '\n';
			}
			organizedImportsString += `${entry.content}\n`;
		});
		organizedImportsString = organizedImportsString.slice(0, -1);

		vscode.window.showInformationMessage(`${range.start.line}-${range.end.line}`);
		vscode.window.activeTextEditor!.edit((editBuilder) => {
			editBuilder.replace(range, organizedImportsString);
		});

		vscode.window.createOutputChannel('sort imports').append(`test:${organizedImports.join('\n')}`);
	}

	private readImports(): [ImportEntry[], vscode.Range] | undefined {
		const editor = vscode.window.activeTextEditor;
		const text = editor?.document?.getText();
		if (!text) {
			return;
		}

		let imports: ImportEntry[] = [];
		let startLine: number | undefined, endLine: number | undefined;

		const lines = text.split('\n');
		let importComments = [];
		for (let index = 0; index < lines.length; index++) {
			const line = lines[index].trim();
			const isLast = index === lines.length - 1;

			if (line.startsWith('import') || line.startsWith('export') || line.startsWith('part')) {
				imports.push({
					content: line,
					comments: [...importComments],
				});
				importComments = [];

				if (startLine === undefined) {
					startLine = index;
				}

				if (isLast) {
					endLine = index;
				}
			} else if (line.startsWith('//')) {
				importComments.push(line);
			} else if (isLast || (!this.isBlank(line) && !line.startsWith('library'))) {
				if (startLine !== undefined) {
					if (index > 0 && this.isBlank(lines[index - 1])) {
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

		return [
			imports,
			new vscode.Selection(
				new vscode.Position(startLine ?? 0, 0),
				new vscode.Position(endLine!, lines[endLine! - 1].length - 1)
			),
		];
	}

	private getImports(rawImports: ImportEntry[]): ImportEntry[] {
		let dartImports = <ImportEntry[]>[];
		let packageImports = <ImportEntry[]>[];
		let packageLocalImports = <ImportEntry[]>[];
		let relativeImports = <ImportEntry[]>[];
		let partStatements = <ImportEntry[]>[];
		let exportStatements = <ImportEntry[]>[];

		let result = <ImportEntry[]>[];

		const addImports = (imports: ImportEntry[]) => {
			if (!imports.length) {
				return;
			}

			// TODO: i don't like that `localeCompare` prioritizes other symbols over slashes.
			const sortedImports = imports.sort((a, b) => a.content.localeCompare(b.content));
			result.push(...sortedImports);
			result.push({ content: '', comments: [] });
		};

		// Get this from preferences
		const arePackageLocalImportsSeparated = true;

		rawImports.forEach((entry) => {
			if (!entry.content) {
				return;
			}

			const content = entry.content;
			if (content.startsWith('export')) {
				exportStatements.push(entry);
			} else if (content.startsWith('part')) {
				partStatements.push(entry);
			} else if (content.includes('dart:')) {
				dartImports.push(entry);
			} else if (
				arePackageLocalImportsSeparated &&
				this.packageName &&
				content.includes(`package:${this.packageName}`)
			) {
				packageLocalImports.push(entry);
			} else if (content.includes('package:')) {
				packageImports.push(entry);
			} else if (!this.isBlank(content)) {
				relativeImports.push(entry);
			}
		});

		addImports(dartImports);
		addImports(packageImports);
		addImports(packageLocalImports);
		addImports(relativeImports);
		addImports(partStatements);
		addImports(exportStatements);

		// Remove the redundant new line added by `addImports`.
		// result.pop();

		return result;
	}
}
