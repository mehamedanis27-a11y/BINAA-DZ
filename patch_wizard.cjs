const fs = require('fs');
const path = require('path');

const wizardPath = path.join(__dirname, 'src', 'components', 'Wizard.jsx');
const renderPath = path.join(__dirname, 'wizard_render.jsx');

let wizardContent = fs.readFileSync(wizardPath, 'utf8');
let renderContent = fs.readFileSync(renderPath, 'utf8');

// Inject BottomTabBar inside the return block just before the last </div>
renderContent = renderContent.replace(
  /    <\/div>\s*$/,
  '      <BottomTabBar activePage="wizard" onNavigate={onNavigate} />\n    </div>\n  }\n'
);

// Ensure BottomTabBar is imported
if (!wizardContent.includes("import BottomTabBar")) {
  wizardContent = wizardContent.replace(
    "import NavSidebar from './NavSidebar'",
    "import NavSidebar from './NavSidebar'\nimport BottomTabBar from './BottomTabBar'"
  );
}

// Split on the exact RENDER comment boundary.
const marker = '/* ════════════════════════════════════════════════';
const splitIndex = wizardContent.indexOf(marker);

if (splitIndex !== -1) {
  const topHalf = wizardContent.slice(0, splitIndex);
  
  const finalContent = topHalf + 
    "  /* ════════════════════════════════════════════════\n" +
    "     RENDER\n" +
    "     ════════════════════════════════════════════════ */\n" +
    renderContent;
    
  fs.writeFileSync(wizardPath, finalContent, 'utf8');
  console.log("Wizard.jsx patched successfully.");
} else {
  console.error("Could not find the RENDER section marker in Wizard.jsx.");
}
