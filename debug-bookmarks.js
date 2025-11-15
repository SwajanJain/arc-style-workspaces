// Bookmark Analysis Script
// Run this in DevTools console when sidepanel is open
// Usage: copy and paste this entire file into console

async function analyzeBookmarks() {
  console.log('🔖 Analyzing Chrome bookmarks...\n');

  // Get entire bookmark tree
  const bookmarkTree = await chrome.bookmarks.getTree();

  // Flatten and analyze
  const analysis = {
    totalBookmarks: 0,
    folders: [],
    flatBookmarks: []
  };

  function traverseBookmarks(nodes, parentPath = '') {
    for (const node of nodes) {
      if (node.children) {
        // This is a folder
        const folderPath = parentPath ? `${parentPath} > ${node.title}` : node.title;

        const bookmarksInFolder = countBookmarksInFolder(node);

        if (bookmarksInFolder > 0 && node.title) {
          analysis.folders.push({
            name: node.title,
            path: folderPath,
            bookmarkCount: bookmarksInFolder,
            depth: folderPath.split(' > ').length,
            id: node.id
          });
        }

        // Recurse into children
        traverseBookmarks(node.children, folderPath);
      } else if (node.url) {
        // This is a bookmark
        analysis.totalBookmarks++;
        analysis.flatBookmarks.push({
          title: node.title,
          url: node.url,
          folder: parentPath
        });
      }
    }
  }

  function countBookmarksInFolder(node) {
    let count = 0;
    if (node.children) {
      for (const child of node.children) {
        if (child.url) {
          count++;
        } else if (child.children) {
          count += countBookmarksInFolder(child);
        }
      }
    }
    return count;
  }

  traverseBookmarks(bookmarkTree);

  // Sort folders by bookmark count
  analysis.folders.sort((a, b) => b.bookmarkCount - a.bookmarkCount);

  // Print summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('BOOKMARK ANALYSIS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log(`📊 Total Bookmarks: ${analysis.totalBookmarks}`);
  console.log(`📁 Total Folders: ${analysis.folders.length}\n`);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TOP BOOKMARK FOLDERS (by bookmark count)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  analysis.folders.slice(0, 20).forEach((folder, idx) => {
    const indent = '  '.repeat(Math.max(0, folder.depth - 1));
    console.log(`${idx + 1}. ${indent}${folder.name}`);
    console.log(`   Path: ${folder.path}`);
    console.log(`   Bookmarks: ${folder.bookmarkCount} | Depth: ${folder.depth}`);
    console.log('');
  });

  // Show potential workspace mapping
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('POTENTIAL WORKSPACE MAPPING');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Only show top-level folders with >2 bookmarks
  const topLevelFolders = analysis.folders.filter(f =>
    f.depth === 1 && f.bookmarkCount >= 2
  );

  if (topLevelFolders.length === 0) {
    console.log('❌ No top-level folders with enough bookmarks found.');
    console.log('   Users might not organize bookmarks in folders.\n');
  } else {
    console.log('✅ Found organized bookmark folders!\n');
    topLevelFolders.forEach(folder => {
      const emoji = guessEmojiForFolder(folder.name);
      console.log(`${emoji} "${folder.name}" → Workspace with ${folder.bookmarkCount} tabs`);
    });
    console.log('');
  }

  // Show bookmark distribution
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('BOOKMARK ORGANIZATION ANALYSIS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const bookmarksInFolders = analysis.flatBookmarks.filter(b => b.folder && b.folder.trim() !== '').length;
  const bookmarksInRoot = analysis.totalBookmarks - bookmarksInFolders;

  console.log(`📁 Bookmarks in folders: ${bookmarksInFolders} (${((bookmarksInFolders / analysis.totalBookmarks) * 100).toFixed(1)}%)`);
  console.log(`📄 Bookmarks in root: ${bookmarksInRoot} (${((bookmarksInRoot / analysis.totalBookmarks) * 100).toFixed(1)}%)`);
  console.log('');

  if (bookmarksInFolders > bookmarksInRoot) {
    console.log('✅ User organizes bookmarks well → Good candidate for folder-based workspaces');
  } else {
    console.log('⚠️ User has unorganized bookmarks → Folder-based approach may not work well');
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Export data
  return {
    totalBookmarks: analysis.totalBookmarks,
    folders: topLevelFolders,
    organizedPercentage: (bookmarksInFolders / analysis.totalBookmarks) * 100
  };
}

function guessEmojiForFolder(name) {
  const lower = name.toLowerCase();

  if (lower.includes('work') || lower.includes('job') || lower.includes('office')) return '💼';
  if (lower.includes('personal') || lower.includes('home')) return '🏠';
  if (lower.includes('dev') || lower.includes('code') || lower.includes('programming')) return '💻';
  if (lower.includes('read') || lower.includes('article') || lower.includes('news')) return '📰';
  if (lower.includes('shop') || lower.includes('buy') || lower.includes('store')) return '🛒';
  if (lower.includes('travel') || lower.includes('trip')) return '✈️';
  if (lower.includes('recipe') || lower.includes('food') || lower.includes('cooking')) return '🍳';
  if (lower.includes('music')) return '🎵';
  if (lower.includes('video') || lower.includes('youtube')) return '📺';
  if (lower.includes('learn') || lower.includes('study') || lower.includes('education')) return '📚';

  return '📁';
}

// Run it
analyzeBookmarks();
