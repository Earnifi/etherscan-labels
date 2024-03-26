import { Browser, Page, firefox } from "playwright";
import { parseError } from "./error/error-parse";
import "dotenv/config";
import PullComponent from "./pull-class";

// scraping modules
import etherscan from "./providers/etherscan";
import basescan from "./providers/basescan";
import { exec } from "child_process";

class Main {
  private browser: Browser | null;
  private page: Page | null;
  private isDebug: boolean;
  private testOne: boolean;
  private testProvider: string;
  private providers: PullComponent[] = []; // Add more providers here as we develop

  constructor(args: string[]) {
    this.browser = null;
    this.page = null;
    this.isDebug =
      args.includes("--debug") || args.includes("-d") || args.includes("-D");
    this.testOne =
      args.includes("--test") || args.includes("-t") || args.includes("-t");
    if (this.testOne) {
      const testIndex = args.findIndex(
        (arg) => arg === "--test" || arg === "-t" || arg === "-T",
      );
      this.testProvider = args[testIndex + 1];
    } else {
      this.testProvider = "";
    }
  }

  public async destroy() {
    await this.closeBrowser();
  }

  private log(...args: string[]): void {
    if (this.isDebug) {
      console.log(...args);
    }
  }

  public async initialize() {
    const { browser, page } = await this.openBrowser();
    this.browser = browser;
    this.page = page;
    this.providers = [];

    // ################# ADD NEW PROVIDERS HERE #################
    this.log("\n------ Adding providers ------");
    this.providers.push(new etherscan(this.browser, this.page, this.isDebug));
    this.providers.push(new basescan(this.browser, this.page, this.isDebug));
    this.log("------ Providers added -------");
    // ##########################################################

    if (this.testProvider !== "") {
      this.providers = this.providers.filter(
        (provider) => provider.name === this.testProvider,
      );
    }
  }

  public async run() {
    this.log("\n------ running master pull -------");
    for (const provider of this.providers) {
      this.log(`Running provider: ${provider.name}`);
      await provider.pull();
      this.log(`Provider ${provider.name} finished\n`);
    }
    this.log("------ master pull finished ------\n");
  }

  private async openBrowser(): Promise<{ browser: Browser; page: Page }> {
    this.log("Opening browser");
    const browser = await firefox.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    this.log("Browser opened");
    return { browser, page };
  }

  private async closeBrowser(): Promise<void> {
    this.log("Closing browser");
    if (this.browser) await this.browser.close();
    this.log("Browser closed");
  }
}
async function mainModule() {
  try {
    const args = process.argv.slice(2);
    const main = new Main(args);

    await main.initialize();
    await main.run();
    await main.destroy();

    exec('npx prettier --write "**/*"', (error: Error | null) => {
      if (error) {
        //   console.error(`Prettier command failed: ${error}`);
        return;
      }
      console.log(`Prettier command executed successfully`);
    });
  } catch (error) {
    parseError(error as Error);
    process.exit(1);
  }
}
await mainModule();
export default Main;
