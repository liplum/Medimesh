import React, { useContext, useEffect, useState } from 'react'
import { Tree } from 'antd'
import * as ft from "./FileTree"
import { FileTreeDeleagteContext, SelectedFileContext } from './View';
import { useTheme } from '@mui/material/styles';
const { DirectoryTree } = Tree;
import { FolderOff } from '@mui/icons-material';
export function FileTreeNavigation(props) {
  const [delegate] = useContext(FileTreeDeleagteContext)
  const [renderTree, setRenderTree] = useState()
  const [selectedFile, setSelectedFile] = useContext(SelectedFileContext)

  useEffect(() => {
    if (!delegate) return
    if (props.searchDelegate) {
      const newRenderTree = ft.filter(delegate.renderTree, props.searchDelegate,
        (id) => delegate.key2File.get(id)
      )
      setRenderTree(newRenderTree)
    }
  }, [props.searchDelegate, delegate])

  const theme = useTheme()
  if (!renderTree) return
  if (renderTree.children.length <= 0)
    return <div className="no-file-label" >
      <FolderOff style={{ width: "8rem", height: "8rem" }} />
    </div>
  return (
    <DirectoryTree
      style={{
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
        fontSize: "1.2rem",
      }}
      showLine={true}
      showIcon={true}
      treeData={renderTree.children}
      defaultSelectedKeys={[selectedFile?.nodeId]}
      defaultExpandedKeys={selectedFile?.tracking}
      onSelect={(keys, _) => {
        if (keys.length > 0) {
          let key = keys[0]
          if (typeof key === "string") {
            key = parseInt(key)
            if (isNaN(key)) return
          }
          const file = delegate.key2File.get(key)
          if (file && file.path !== selectedFile.path) {
            setSelectedFile(file)
          }
        }
      }}
    />
  );
}
