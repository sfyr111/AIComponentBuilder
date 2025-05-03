import React, { useEffect, useRef, useState } from "react";
import { Editor, OnMount, BeforeMount, Monaco } from "@monaco-editor/react";
import type { editor } from "monaco-editor";

interface CodeEditorProps {
  code: string;
  onChange: (value: string) => void;
}

export function CodeEditor({ code, onChange }: CodeEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);
  
  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor;
    setIsEditorReady(true);
  };
  
  // use pushEditOperations to update content, keep edit history
  useEffect(() => {
    if (isEditorReady && editorRef.current) {
      const model = editorRef.current.getModel();
      if (model && model.getValue() !== code) {
        model.pushEditOperations(
          [],
          [{ range: model.getFullModelRange(), text: code }],
          () => null
        );
      }
    }
  }, [code, isEditorReady]);
  
  const handleBeforeMount: BeforeMount = (monaco: Monaco) => {
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ESNext,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      jsx: monaco.languages.typescript.JsxEmit.React,
      jsxFactory: 'React.createElement',
      reactNamespace: 'React',
      allowJs: true,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
    });

    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: true,
    });
  };
  
  return (
    <div className="flex-1 w-full border rounded-md overflow-hidden" style={{ height: "100%" }}>
      <Editor
        height="100%"
        width="100%"
        path="component.tsx"
        language="typescript"
        value={code}
        onChange={(value) => value !== undefined && onChange(value)}
        onMount={handleEditorDidMount}
        beforeMount={handleBeforeMount}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          wordWrap: "on",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          folding: true,
          lineNumbers: "on",
          renderLineHighlight: "all",
          colorDecorators: true
        }}
      />
    </div>
  );
}