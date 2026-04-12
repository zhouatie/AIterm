import React, { useState, useCallback, useEffect } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileText,
  ChevronsDownUp,
  ChevronsUpDown,
  Loader2,
} from 'lucide-react';
import type { DirEntry } from '../preload';

// --- Types ---

interface TreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: TreeNode[];
  isLoaded?: boolean;
  isExpanded?: boolean;
}

interface FileTreeProps {
  rootPath: string;
  selectedFile: string | null;
  onSelectFile: (filePath: string) => void;
}

// --- Helpers ---

function isMdFile(name: string): boolean {
  return name.toLowerCase().endsWith('.md');
}

function sortEntries(entries: DirEntry[]): DirEntry[] {
  return [...entries].sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });
}

async function loadDirectory(dirPath: string): Promise<TreeNode[]> {
  const result = await window.fileApi.readDir(dirPath);
  if (result.error || !result.entries) return [];

  const sorted = sortEntries(result.entries);
  const nodes: TreeNode[] = [];

  for (const entry of sorted) {
    const entryPath = `${dirPath}/${entry.name}`;
    if (entry.name.startsWith('.')) continue;

    if (entry.isDirectory) {
      if (entry.containsMarkdown) {
        nodes.push({
          name: entry.name,
          path: entryPath,
          isDirectory: true,
          isLoaded: false,
          isExpanded: false,
        });
      }
    } else if (entry.isFile && isMdFile(entry.name)) {
      nodes.push({
        name: entry.name,
        path: entryPath,
        isDirectory: false,
      });
    }
  }

  return nodes;
}

// --- Constants ---

const INDENT_PX = 20;
const ICON_SIZE = 15;
const ICON_COLOR = '#8b8b8b';
const ICON_COLOR_ACTIVE = '#5a5a5a';
const ROW_HEIGHT = 28;

// --- Toolbar ---

interface ToolbarProps {
  onExpandAll: () => void;
  onCollapseAll: () => void;
  allExpanded: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({ onExpandAll, onCollapseAll, allExpanded }) => {
  const ToggleIcon = allExpanded ? ChevronsDownUp : ChevronsUpDown;
  const toggleAction = allExpanded ? onCollapseAll : onExpandAll;
  const title = allExpanded ? 'Collapse All' : 'Expand All';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        padding: '4px 8px',
        borderBottom: '1px solid #e8e8e8',
        flexShrink: 0,
      }}
    >
      <button
        onClick={toggleAction}
        title={title}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 24,
          height: 24,
          border: 'none',
          background: 'transparent',
          borderRadius: 4,
          cursor: 'pointer',
          color: ICON_COLOR,
          padding: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#f0f0f0';
          e.currentTarget.style.color = ICON_COLOR_ACTIVE;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = ICON_COLOR;
        }}
      >
        <ToggleIcon size={16} />
      </button>
    </div>
  );
};

// --- Tree Node Row ---

interface TreeNodeItemProps {
  node: TreeNode;
  depth: number;
  selectedFile: string | null;
  onSelectFile: (filePath: string) => void;
  onToggleDir: (node: TreeNode) => void;
  /** For each ancestor depth, whether that ancestor has more siblings below */
  guideFlags: boolean[];
}

const TreeNodeItem: React.FC<TreeNodeItemProps> = ({
  node,
  depth,
  selectedFile,
  onSelectFile,
  onToggleDir,
  guideFlags,
}) => {
  const isSelected = !node.isDirectory && node.path === selectedFile;

  const handleClick = () => {
    if (node.isDirectory) {
      onToggleDir(node);
    } else {
      onSelectFile(node.path);
    }
  };

  // Build indent guides
  const guides = [];
  for (let i = 0; i < depth; i++) {
    guides.push(
      <span
        key={i}
        style={{
          display: 'inline-block',
          width: INDENT_PX,
          height: ROW_HEIGHT,
          position: 'relative',
          flexShrink: 0,
        }}
      >
        {guideFlags[i] && (
          <span
            style={{
              position: 'absolute',
              left: INDENT_PX / 2 - 0.5,
              top: 0,
              bottom: 0,
              width: 1,
              backgroundColor: '#e4e4e4',
            }}
          />
        )}
      </span>,
    );
  }

  return (
    <>
      <div
        onClick={handleClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          height: ROW_HEIGHT,
          paddingRight: 8,
          cursor: 'pointer',
          backgroundColor: isSelected ? '#e8f0fe' : 'transparent',
          fontSize: 13,
          color: '#333',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          userSelect: 'none',
        }}
        onMouseEnter={(e) => {
          if (!isSelected) {
            e.currentTarget.style.backgroundColor = '#f5f5f5';
          }
        }}
        onMouseLeave={(e) => {
          if (!isSelected) {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
      >
        {/* Indent guides */}
        {guides}

        {/* Chevron arrow (directories only) */}
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 16,
            height: ROW_HEIGHT,
            flexShrink: 0,
            color: '#999',
          }}
        >
          {node.isDirectory &&
            (node.isExpanded ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            ))}
        </span>

        {/* Icon */}
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 18,
            marginRight: 5,
            flexShrink: 0,
            color: node.isDirectory ? '#dcb67a' : ICON_COLOR,
          }}
        >
          {node.isDirectory ? (
            node.isExpanded ? (
              <FolderOpen size={ICON_SIZE} />
            ) : (
              <Folder size={ICON_SIZE} />
            )
          ) : (
            <FileText size={ICON_SIZE} />
          )}
        </span>

        {/* Name */}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {node.name}
        </span>
      </div>

      {/* Children */}
      {node.isDirectory && node.isExpanded && node.children && (
        <>
          {node.children.map((child, idx) => (
            <TreeNodeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedFile={selectedFile}
              onSelectFile={onSelectFile}
              onToggleDir={onToggleDir}
              guideFlags={[
                ...guideFlags,
                idx < node.children!.length - 1, // true if more siblings below
              ]}
            />
          ))}
        </>
      )}
    </>
  );
};

// --- Main FileTree ---

const FileTree: React.FC<FileTreeProps> = ({ rootPath, selectedFile, onSelectFile }) => {
  const [nodes, setNodes] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [allExpanded, setAllExpanded] = useState(false);

  // Load root directory when rootPath changes
  useEffect(() => {
    if (!rootPath) return;
    let cancelled = false;
    setLoading(true);
    setAllExpanded(false);
    loadDirectory(rootPath).then((result) => {
      if (!cancelled) {
        setNodes(result);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [rootPath]);

  // Deep update a node in the tree by path
  const updateNode = useCallback(
    (nodePath: string, updater: (n: TreeNode) => TreeNode) => {
      const updateRecursive = (list: TreeNode[]): TreeNode[] =>
        list.map((n) => {
          if (n.path === nodePath) return updater(n);
          if (n.isDirectory && n.children) {
            return { ...n, children: updateRecursive(n.children) };
          }
          return n;
        });
      setNodes((prev) => updateRecursive(prev));
    },
    [],
  );

  const handleToggleDir = useCallback(
    async (node: TreeNode) => {
      if (node.isExpanded) {
        updateNode(node.path, (n) => ({ ...n, isExpanded: false }));
        setAllExpanded(false);
      } else {
        if (!node.isLoaded) {
          const children = await loadDirectory(node.path);
          updateNode(node.path, (n) => ({
            ...n,
            isExpanded: true,
            isLoaded: true,
            children,
          }));
        } else {
          updateNode(node.path, (n) => ({ ...n, isExpanded: true }));
        }
      }
    },
    [updateNode],
  );

  // Expand all: recursively load + expand every directory node
  const handleExpandAll = useCallback(async () => {
    async function expandRecursive(list: TreeNode[]): Promise<TreeNode[]> {
      const result: TreeNode[] = [];
      for (const node of list) {
        if (node.isDirectory) {
          let children = node.children;
          if (!node.isLoaded) {
            children = await loadDirectory(node.path);
          }
          const expandedChildren = children ? await expandRecursive(children) : [];
          result.push({
            ...node,
            isExpanded: true,
            isLoaded: true,
            children: expandedChildren,
          });
        } else {
          result.push(node);
        }
      }
      return result;
    }
    const expanded = await expandRecursive(nodes);
    setNodes(expanded);
    setAllExpanded(true);
  }, [nodes]);

  // Collapse all
  const handleCollapseAll = useCallback(() => {
    function collapseRecursive(list: TreeNode[]): TreeNode[] {
      return list.map((n) =>
        n.isDirectory
          ? { ...n, isExpanded: false, children: n.children ? collapseRecursive(n.children) : undefined }
          : n,
      );
    }
    setNodes((prev) => collapseRecursive(prev));
    setAllExpanded(false);
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Toolbar
          onExpandAll={handleExpandAll}
          onCollapseAll={handleCollapseAll}
          allExpanded={allExpanded}
        />
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Loader2
            size={20}
            style={{ color: '#999', animation: 'spin 1s linear infinite' }}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar
        onExpandAll={handleExpandAll}
        onCollapseAll={handleCollapseAll}
        allExpanded={allExpanded}
      />
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {nodes.length === 0 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              fontSize: 13,
              color: '#999',
            }}
          >
            No Markdown files found
          </div>
        ) : (
          nodes.map((node, idx) => (
            <TreeNodeItem
              key={node.path}
              node={node}
              depth={0}
              selectedFile={selectedFile}
              onSelectFile={onSelectFile}
              onToggleDir={handleToggleDir}
              guideFlags={[idx < nodes.length - 1]}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default FileTree;
