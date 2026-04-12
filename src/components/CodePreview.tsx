import React, { useMemo } from 'react';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { getLanguageByExtension } from '../utils/file-types';

interface CodePreviewProps {
  content: string | null;
  filePath: string | null;
}

const CodePreview: React.FC<CodePreviewProps> = ({ content, filePath }) => {
  const language = useMemo(
    () => (filePath ? getLanguageByExtension(filePath) : null),
    [filePath],
  );

  if (!content || !filePath) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: '#999',
          fontSize: 14,
          userSelect: 'none',
        }}
      >
        选择一个文件以预览
      </div>
    );
  }

  return (
    <div
      style={{
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
    >
      <SyntaxHighlighter
        language={language ?? undefined}
        useInlineStyles={false}
        showLineNumbers
        lineNumberStyle={{
          color: '#999',
          userSelect: 'none',
          minWidth: '3em',
          textAlign: 'right',
          paddingRight: '1em',
          borderRight: '1px solid #e1e4e8',
          marginRight: '1em',
        }}
        customStyle={{
          margin: 0,
          padding: '16px 0',
          background: 'transparent',
          fontSize: '13px',
          lineHeight: '1.5',
          fontFamily:
            "'JetBrainsMono Nerd Font', 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
        }}
        codeTagProps={{
          style: {
            fontFamily: 'inherit',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          },
        }}
      >
        {content}
      </SyntaxHighlighter>
    </div>
  );
};

export default CodePreview;
