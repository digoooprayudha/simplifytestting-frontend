/**
 * Katalon Studio project skeleton file generators.
 * These produce the XML and config files needed for Katalon Studio to recognize 
 * the exported ZIP as a valid importable project.
 */

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Generate .prj project file */
export function generateProjectFile(projectName: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Project>
   <description></description>
   <name>${escapeXml(projectName)}</name>
   <tag></tag>
   <migratedVersion>5.9.1</migratedVersion>
   <pageLoadTimeout>0</pageLoadTimeout>
   <projectFileVersion>1.0</projectFileVersion>
   <sourceContent>
      <sourceFolderList>
         <sourceFolderConfiguration>
            <url>Include/scripts/groovy</url>
         </sourceFolderConfiguration>
      </sourceFolderList>
      <systemFileList/>
      <testCaseFileList/>
      <testSuiteFileList/>
      <checkpointFileList/>
   </sourceContent>
   <type>WEBUI</type>
</Project>`;
}

/** Generate Profiles/default.glbl with GlobalVariable definitions */
export function generateProfileXml(baseUrl: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<GlobalVariableEntities>
   <description></description>
   <name>default</name>
   <tag></tag>
   <defaultProfile>true</defaultProfile>
   <GlobalVariableEntity>
      <defaultValue>'${escapeXml(baseUrl)}'</defaultValue>
      <description>Base URL of the application under test</description>
      <initValue>'${escapeXml(baseUrl)}'</initValue>
      <name>base_url</name>
   </GlobalVariableEntity>
   <GlobalVariableEntity>
      <defaultValue>30</defaultValue>
      <description>Default timeout in seconds</description>
      <initValue>30</initValue>
      <name>timeout</name>
   </GlobalVariableEntity>
</GlobalVariableEntities>`;
}

/** Generate Test Cases/TC_CODE.tc metadata file */
export function generateTestCaseMetaXml(tcCode: string, description?: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<TestCaseEntity>
   <description>${escapeXml(description || "")}</description>
   <name>${escapeXml(tcCode)}</name>
   <tag></tag>
   <comment></comment>
   <testCaseGuid>${crypto.randomUUID()}</testCaseGuid>
</TestCaseEntity>`;
}

/** Generate settings/internal/com.kms.katalon.core.webui.webui.properties */
export function generateWebUiSettings(browser: string): string {
  const driverMap: Record<string, string> = {
    Chrome: "CHROME_DRIVER",
    Firefox: "FIREFOX_DRIVER", 
    Edge: "EDGE_CHROMIUM_DRIVER",
    Safari: "SAFARI_DRIVER",
  };
  return `#${new Date().toISOString()}
EXECUTION_DEFAULT_TIMEOUT=30
EXECUTION_DRIVER_PROPERTY=${driverMap[browser] || "CHROME_DRIVER"}
WAIT_FOR_ANGULAR_ENABLED=false`;
}

/** Generate settings/execution/default.properties */
export function generateExecutionSettings(): string {
  return `#Default execution settings
hostName=
hostOS=
DEFAULT_TIMEOUT=30`;
}

/** Check if content looks like JSON (old format) vs XML (new format) */
export function isJsonContent(content: string): boolean {
  const trimmed = content.trim();
  return trimmed.startsWith("{") || trimmed.startsWith("[");
}

/** Convert old JSON Object Repository entry to Katalon XML .rs format */
export function convertJsonToObjectRepoXml(jsonContent: string): string {
  try {
    const obj = JSON.parse(jsonContent);
    const locatorMap: Record<string, string> = {
      id: "BASIC",
      css: "CSS",
      xpath: "XPATH",
      text: "XPATH",
    };
    const selectorMethod = locatorMap[obj.locator_type] || "BASIC";
    
    let selectorValue = obj.locator_value || "PLACEHOLDER";
    if (obj.locator_type === "id") {
      selectorValue = `//*[@id='${obj.locator_value}']`;
    } else if (obj.locator_type === "text") {
      selectorValue = `//*[contains(text(),'${obj.locator_value}')]`;
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<WebElementEntity>
   <description>${escapeXml(obj.notes || obj.element_label || "")}</description>
   <name>${escapeXml(obj.name || "Unknown")}</name>
   <tag></tag>
   <elementGuidId>${crypto.randomUUID()}</elementGuidId>
   <selectorCollection>
      <entry>
         <key>XPATH</key>
         <value>${escapeXml(selectorValue)}</value>
      </entry>${obj.locator_type === "css" ? `
      <entry>
         <key>CSS</key>
         <value>${escapeXml(obj.locator_value)}</value>
      </entry>` : ""}${obj.locator_type === "id" ? `
      <entry>
         <key>BASIC</key>
         <value>//*[@id = '${escapeXml(obj.locator_value)}']</value>
      </entry>` : ""}
   </selectorCollection>
   <selectorMethod>${selectorMethod}</selectorMethod>
   <useRalativeImagePath>true</useRalativeImagePath>
</WebElementEntity>`;
  } catch {
    return jsonContent; // Return as-is if parse fails
  }
}

/** Convert old JSON Test Suite to Katalon XML .ts format */
export function convertJsonToTestSuiteXml(jsonContent: string): string {
  try {
    const suite = JSON.parse(jsonContent);
    const testCases = suite.included_test_cases || [];
    const entries = testCases.map((tc: string) => `
   <testCaseLink>
      <guid>${crypto.randomUUID()}</guid>
      <isReuseDriver>false</isReuseDriver>
      <isRun>true</isRun>
      <testCaseId>Test Cases/${tc}</testCaseId>
      <usingDataBindingAtTestSuiteLevel>true</usingDataBindingAtTestSuiteLevel>
   </testCaseLink>`).join("");

    return `<?xml version="1.0" encoding="UTF-8"?>
<TestSuiteEntity>
   <description></description>
   <name>${escapeXml(suite.name || "TestSuite")}</name>
   <tag></tag>
   <isRerun>false</isRerun>
   <mailRecipient></mailRecipient>
   <numberOfRerun>3</numberOfRerun>
   <pageLoadTimeout>30</pageLoadTimeout>
   <pageLoadTimeoutDefault>true</pageLoadTimeoutDefault>
   <rerunFailedTestCasesOnly>false</rerunFailedTestCasesOnly>${entries}
</TestSuiteEntity>`;
  } catch {
    return jsonContent;
  }
}
