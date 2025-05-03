import React, { useEffect, useRef, useState } from "react";
import { Editor, OnMount, BeforeMount, Monaco } from "@monaco-editor/react";
import type { editor } from "monaco-editor";

interface CodeEditorProps {
  code: string;
  onChange: (value: string) => void;
}

export function CodeEditor({ code, onChange }: CodeEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const [isEditorReady, setIsEditorReady] = useState(false)
  
  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor
    setIsEditorReady(true)
  }
  
  useEffect(() => {
    if (isEditorReady && editorRef.current && code !== editorRef.current.getValue()) {
      editorRef.current.setValue(code)
    }
  }, [code, isEditorReady])
  
  const handleBeforeMount: BeforeMount = (monaco: Monaco) => {
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      jsx: monaco.languages.typescript.JsxEmit.React,
      jsxFactory: 'React.createElement',
      reactNamespace: 'React',
      allowNonTsExtensions: true,
      allowJs: true,
      target: monaco.languages.typescript.ScriptTarget.Latest,
    });
  };
  
  return (
    <div className="flex-1 w-full border rounded-md overflow-hidden" style={{ height: "100%" }}>
      <Editor
        height="100%"
        width="100%"
        language="javascript"
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
        }}
      />
    </div>
  );
}