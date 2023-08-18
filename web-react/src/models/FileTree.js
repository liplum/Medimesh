export function createDelegate({ name, root, }) {
  let key = 0
  const rootRenderTree = {
    key: key++,
    title: name,
    children: [],
    path: "",
    tracking: [key]
  }
  const key2File = new Map()
  const path2File = new Map()
  function createNode(curDir, curFileTree) {
    const entries = Object.entries(curFileTree)
    reorder(entries)
    for (const [name, file] of iterateFiles(entries)) {
      const tag = file["*tag"]
      const curKey = key++
      // if file has a type, it presents a file
      if (file["*type"]) {
        // fileObj is for both TreeView component and actual FileTree.
        const fileObj = {
          name,
          isLeaf: true,
          title: name,
          key: curKey,
          path: `${curDir.path}/${name}`,
          type: file["*type"],
          size: file.size,
          tracking: [...curDir.tracking, curKey],
        }
        fileObj.url = `file/${fileObj.path}`
        path2File.set(fileObj.path, fileObj)
        key2File.set(curKey, fileObj)
        curDir.children.push(fileObj)
      } else {
        // otherwise, it presents a directory
        if (tag?.main && file[tag.main]) {
          const mainName = tag.main
          const mainFile = file[mainName]
          const fileObj = {
            name,
            isLeaf: true,
            title: name,
            key: curKey,
            path: `${curDir.path}/${name}`,
            type: mainFile["*type"],
            size: mainFile.size,
            tracking: [...curDir.tracking, curKey],
          }
          fileObj.url = `file/${curDir.path}/${name}/${mainName}`
          path2File.set(fileObj.path, fileObj)
          key2File.set(curKey, fileObj)
          curDir.children.push(fileObj)
        } else {
          const dirObj = {
            key: curKey,
            title: name,
            path: curDir !== rootRenderTree ? `${curDir.path}/${name}` : name,
            children: [],
            tracking: [...curDir.tracking, curKey],
          }
          curDir.children.push(dirObj)
          createNode(dirObj, file)
        }
      }
    }
  }
  createNode(rootRenderTree, root)
  return {
    renderTree: rootRenderTree,
    key2File,
    path2File,
    maxKey: key,
    name,
  }
}

function* iterateFiles(tree) {
  for (const entry of tree) {
    if (entry[0] === "*hide" || entry[0] === "*tag") {
      continue
    }
    yield entry
  }
}

export function getFirstFile(fileTreeDelegate) {
  const values = fileTreeDelegate.path2File.values()
  if (values.length) {
    return values[0]
  }
  return null
}

/**
 *  @author chatGPT
 *  @returns the render tree
 */
export function filter(renderTree, searchDelegate) {
  function filterTree(tree) {
    // base case: leaf node
    if (!tree.children) {
      const file = tree
      return searchDelegate(file) ? tree : null
    }

    // filter children recursively
    const filteredChildren = tree.children.map(child => filterTree(child)).filter(child => child !== null)

    // return null if no children match
    if (filteredChildren.length === 0) {
      return null
    }

    // create a new node with the filtered children
    return {
      ...tree,
      children: filteredChildren
    }
  }
  let root = filterTree(renderTree)
  if (!root) {
    root = {
      ...renderTree,
      children: []
    }
  }
  return root
}

/**
 *  @author chatGPT
 */
function reorder(array) {
  array.sort((a, b) => {
    const [fileNameA, fileA] = a
    const [fileNameB, fileB] = b
    // if both fileA and fileB are directories
    if (typeof fileA === "object" && typeof fileB === "object") {
      // just compare in string
      return fileNameA.localeCompare(fileNameB)
    }

    const extensionA = fileNameA.split(".").pop()
    const extensionB = fileNameB.split(".").pop()

    // Group files with the same extension together
    if (extensionA !== extensionB) {
      return extensionA.localeCompare(extensionB)
    }

    // Compare files without the extension
    const fileNameOnlyA = fileNameA.replace(/\.[^/.]+$/, "")
    const fileNameOnlyB = fileNameB.replace(/\.[^/.]+$/, "")

    // Check if both file names contain only numbers
    if (/^\d+$/.test(fileNameOnlyA) && /^\d+$/.test(fileNameOnlyB)) {
      return parseInt(fileNameOnlyA) - parseInt(fileNameOnlyB)
    }

    // Check if both file names have a number in them
    const numberA = parseInt(fileNameOnlyA.match(/\d+/))
    const numberB = parseInt(fileNameOnlyB.match(/\d+/))
    if (numberA && numberB && numberA !== numberB) {
      return numberA - numberB
    }

    // Use lexicographic order as a fallback
    return fileNameA.localeCompare(fileNameB)
  })
}