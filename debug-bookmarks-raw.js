// Super detailed bookmark tree viewer
// This will show EVERYTHING in your bookmark structure

async function showBookmarkTree() {
  const tree = await chrome.bookmarks.getTree();

  console.log('🔍 COMPLETE BOOKMARK TREE DUMP\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  function printNode(node, depth = 0, index = 0) {
    const indent = '  '.repeat(depth);
    const prefix = `${indent}[Depth ${depth}][#${index}]`;

    console.log(`${prefix} ID: ${node.id}`);
    console.log(`${prefix} Title: "${node.title || '(no title)'}"`);
    console.log(`${prefix} URL: ${node.url || '(no URL - is folder)'}`);
    console.log(`${prefix} Has children: ${node.children ? 'YES (' + node.children.length + ')' : 'NO'}`);
    console.log(`${prefix} Date added: ${node.dateAdded ? new Date(node.dateAdded).toLocaleString() : 'N/A'}`);
    console.log('');

    if (node.children) {
      console.log(`${indent}  ↓ Recursing into ${node.children.length} children...\n`);
      node.children.forEach((child, idx) => {
        printNode(child, depth + 1, idx);
      });
    }
  }

  tree.forEach((node, idx) => {
    printNode(node, 0, idx);
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  return tree;
}

showBookmarkTree();
