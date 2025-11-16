// Debug Onboarding - Check what bookmarks are being found
// Run this in DevTools console when sidepanel is open

async function debugOnboarding() {
  console.log('🔍 Debugging Onboarding - Bookmark Import\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Get bookmark tree
  const bookmarkTree = await chrome.bookmarks.getTree();
  console.log('📚 Raw Bookmark Tree:', bookmarkTree);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Extract folders using same logic as onboarding
  const folders = [];
  const systemFolders = ['mobile bookmarks', 'other bookmarks', 'reading list'];

  function traverseBookmarks(nodes, depth = 0, parentPath = '') {
    console.log(`${'  '.repeat(depth)}📂 Depth ${depth}: Processing ${nodes.length} nodes`);

    for (const node of nodes) {
      const path = parentPath ? `${parentPath} > ${node.title}` : node.title;

      if (node.children && node.title) {
        console.log(`${'  '.repeat(depth)}  Folder: "${node.title}" (depth: ${depth})`);

        // Skip system folders
        if (systemFolders.includes(node.title.toLowerCase())) {
          console.log(`${'  '.repeat(depth)}    ⚠️ SKIPPED (system folder)`);
          traverseBookmarks(node.children, depth + 1, path);
          continue;
        }

        // Use user's bookmark folders (depth 2)
        if (depth === 2) {
          const bookmarks = [];
          collectBookmarks(node, bookmarks);

          console.log(`${'  '.repeat(depth)}    ✅ USER FOLDER (depth 2): ${bookmarks.length} bookmarks found`);

          if (bookmarks.length > 0) {
            folders.push({
              name: node.title,
              bookmarks: bookmarks,
              depth: depth
            });
          }
        } else {
          console.log(`${'  '.repeat(depth)}    ⏭️ SKIPPED (depth ${depth}, need depth 2)`);
        }

        // Recurse into children
        traverseBookmarks(node.children, depth + 1, path);
      } else if (node.url) {
        console.log(`${'  '.repeat(depth)}  📄 Bookmark: "${node.title}" - ${node.url}`);
      }
    }
  }

  function collectBookmarks(node, bookmarks) {
    if (node.children) {
      for (const child of node.children) {
        if (child.url) {
          bookmarks.push({
            title: child.title,
            url: child.url
          });
        } else if (child.children) {
          collectBookmarks(child, bookmarks);
        }
      }
    }
  }

  traverseBookmarks(bookmarkTree);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('EXTRACTION RESULTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (folders.length === 0) {
    console.log('❌ NO TOP-LEVEL FOLDERS FOUND');
    console.log('   Possible reasons:');
    console.log('   1. All bookmarks are in root (not in folders)');
    console.log('   2. All folders are nested (depth > 1)');
    console.log('   3. All folders are system folders (Mobile, Other, Reading List)');
  } else {
    console.log(`✅ Found ${folders.length} top-level bookmark folders:\n`);
    folders.forEach((folder, idx) => {
      console.log(`${idx + 1}. "${folder.name}" (${folder.bookmarks.length} bookmarks)`);
      folder.bookmarks.slice(0, 3).forEach(bm => {
        console.log(`     - ${bm.title}`);
      });
      if (folder.bookmarks.length > 3) {
        console.log(`     ... and ${folder.bookmarks.length - 3} more`);
      }
    });
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  return folders;
}

// Run it
debugOnboarding();
