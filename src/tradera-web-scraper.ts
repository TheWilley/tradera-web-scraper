//Puppeteer library
export { getProductInfo }
import * as puppeteer from "puppeteer";
let browserInstance: puppeteer.Page;

// Bid is a bid on an auction
interface Bid {
    bidder: string;
    bid: string;
    time: string;
}

// AuctionInfo is the information that is available on a auction page (e.g. a bid)
interface AuctionInfo {
    // Acution and seller information
    sellerName: string;
    isAuction: boolean;
    aucutionName: string;
    auctionEnded: boolean;

    // Bid information
    allBids: Bid[];
    highestBid: string;
    numberOfBids: number;

    // Time information
    timeLeft: string;
    endTime: string;

    // Buy now information
    buyNowPrice: string;
    buyNowAvailable: boolean;

    // Other information
    description: string;
    images: string[];
}

// ProductInfo is the information that is available on a product page and is not an auction (e.g. buy now)
interface ProductInfo {
    // Acution and seller information
    sellerName: string;
    isAuction: boolean;
    productName: string;
    productSold: boolean;

    // Buy now information
    buyNowPrice: number;

    // Other information
    description: string;
    images: string[];
}

// CompiledPageObject is the object that is returned from the getAuctionInfo function and contains either AuctionInfo or ProductInfo
type PageInfo = AuctionInfo | ProductInfo;

/**
 * Helper functions for puppeteer
 * @returns A helper object with functions that can be used to get information from the product page
 */
function puppeteerHelper() {
    return {
        getSelectorText: async (selector: string, property: keyof Element, callback?: (result: unknown) => unknown) => {
            // To make the variable available in the catch block
            var _result_;

            // Try to get the text from the selector
            try {
                _result_ = await browserInstance.$eval(selector, (element, property) => { return element[property] }, property);

                // Check if callback is defined and return result
                if (callback)
                    return callback(_result_);
                else
                    return _result_
            } catch (e) {
                if (callback)
                    return callback(undefined);
                else
                    return undefined;
            }

        },
        getAllBids: async () => {
            // Open bid history
            await browserInstance.click(".bid-details-bids-title > span > a");
            await browserInstance.waitForSelector(".table-fixed > tbody:nth-child(2) > tr:nth-child(1)");

            // Wait for bid history to load and get all bids
            const _result_ = await browserInstance.evaluate(() => {
                const bids: Bid[] = [];
                const bidElements = document.querySelectorAll(".table-fixed > tbody > tr");
                bidElements.forEach((element: HTMLElement) => {
                    const bidder = (element.children[0] as HTMLElement).innerText;
                    const bid = (element.children[1] as HTMLElement).innerText;
                    const time = (element.children[3] as HTMLElement).innerText;

                    bids.push({
                        bidder: bidder,
                        bid: bid,
                        time: time
                    });
                });

                return bids;
            });

            // Close bid history
            await browserInstance.click(".tr-modal-header > button:nth-child(2)");

            // Check if callback is defined and return result
            return _result_;
        },
        async getAllImages() {
            /**
             * Remove duplicates from an array (https://www.geeksforgeeks.org/how-to-remove-duplicate-elements-from-javascript-array/)
             * @param array The array to remove duplicates from
             * @returns The array without duplicates
             */
            const removeDuplicates = (array: string[]) => {
                var uniqueStrings: string[] = [];
                array.forEach(element => {
                    if (!uniqueStrings.includes(element)) {
                        uniqueStrings.push(element);
                    }
                });

                return uniqueStrings;
            }

            const _result_ = await browserInstance.evaluate(() => {
                const images: string[] = [];
                const imageElements = document.querySelectorAll(".image-gallery-item__image");
                imageElements.forEach((element: HTMLImageElement) => {
                    images.push(element.src);
                });

                return images;
            });

            return removeDuplicates(_result_);
        }
    };
}

/**
 * Setup the browser instance
 */
async function setup() {
    // Check if page url contains "item" and exit if not
    console.log("Checking if page is a product page...")
    if (!browserInstance.url().includes("item")) {
        console.log("Not an product page (page might have been removed)");
        process.exit(0);
    }

    // Check if page is not found and exit if not
    console.log("Checking if page is not found...")
    if (await puppeteerHelper().getSelectorText(".not-found-container", "innerHTML", (result) => result != undefined ? true : false)) {
        console.log("Page returned 404");
        process.exit(0);
    }

    // Attempt to accept cookies
    console.log("Attempting to accept cookies...")
    try {
        await browserInstance.waitForSelector("#qc-cmp2-ui > div.qc-cmp2-footer.qc-cmp2-footer-overlay.qc-cmp2-footer-scrolled > div > button.css-14ubilm");
        await browserInstance.click("#qc-cmp2-ui > div.qc-cmp2-footer.qc-cmp2-footer-overlay.qc-cmp2-footer-scrolled > div > button.css-14ubilm");
    } catch (e) {
        console.log("Could not click accept cookies");
    }

    // Attempt to remove language selection
    console.log("Attempting to remove language selection...")
    try {
        await browserInstance.waitForSelector("#tr-modal-body > div.position-absolute", { timeout: 1000 });
        await browserInstance.click("#tr-modal-body > div.position-absolute > button");
    } catch (e) {
        console.log("Could not remove language selection");
    }

    console.log("All checks passed, starting scraping...")
}

/**
 * Start browser instance
 * @param product_url The url to the product
 */
async function startBrowser(product_url: string) {
    /**
     * Validate url string (https://www.freecodecamp.org/news/check-if-a-javascript-string-is-a-url/)
     * @param urlString The url to validate
     * @returns True if the url is valid, false if not
     */
    const isValidUrl = (urlString: string) => {
        var urlPattern = new RegExp('^(https?:\\/\\/)?' + // validate protocol
            '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // validate domain name
            '((\\d{1,3}\\.){3}\\d{1,3}))' + // validate OR ip (v4) address
            '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // validate port and path
            '(\\?[;&a-z\\d%_.~+=-]*)?' + // validate query string
            '(\\#[-a-z\\d_]*)?$', 'i'); // validate fragment locator
        return !!urlPattern.test(urlString);
    }

    // Check if product url is valid
    if (product_url == undefined || !isValidUrl(product_url) || !/^.*tradera\.(com|se)(\/[a-z]{2})?\/item.*$/.test(product_url)) {
        console.log("No product url provided, invalid url or url is not a tradera item");
        process.exit(0);
    }
    // Launch browser in headless mode
    const browser = await puppeteer.launch();
    // Browser new page
    const page = await browser.newPage();
    // Launch URL
    await page.goto(product_url);
    // Set browser instance
    browserInstance = page;

    // Wait for setup to finish
    await setup();
}

/**
 * Get item type (auction or product)
 * @returns The item type (auction or product)
 */
async function getItemType() {
    // TODO: Check type of product (auction or product)
    return "auction"
}

/**
 * Get product information
 */
async function getProductInfo(product_url: string) {
    var pageInfo: PageInfo;

    // Start browser
    await startBrowser(product_url);

    if (await getItemType() == "auction") {
        pageInfo = {
            sellerName: await puppeteerHelper().getSelectorText(".seller-alias", "textContent") as string, // Use this format
            isAuction: await puppeteerHelper().getSelectorText(".bid-details-bids-title", "innerHTML", (result) => { return result ? true : false }) as boolean,
            aucutionName: await puppeteerHelper().getSelectorText("#view-item-main", "textContent") as string,
            auctionEnded: await puppeteerHelper().getSelectorText("div.flex-md-row:nth-child(2) > div:nth-child(2) > p:nth-child(1) > span:nth-child(1)", "innerHTML", (result) => { return result == undefined ? true : false }) as boolean,
            highestBid: await puppeteerHelper().getSelectorText(".animate-on-value-change_animate-on-value-change__vU1Oh > span:nth-child(1)", "textContent", (result) => { return result; }) as string,
            timeLeft: await puppeteerHelper().getSelectorText("div.flex-md-row:nth-child(2) > div:nth-child(2) > p:nth-child(1) > span:nth-child(1)", "textContent", (result) => { return result != undefined ? result : 0 }) as string,
            buyNowPrice: await puppeteerHelper().getSelectorText("button.btn-md:nth-child(3)", "textContent", (result) => { return result != undefined ? result : 0 }) as string,
            buyNowAvailable: await puppeteerHelper().getSelectorText("button.btn-md:nth-child(3)", "textContent", (result) => { return result != undefined ? true : false }) as boolean,
            description: await puppeteerHelper().getSelectorText(".overflow-hidden.text-break.position-relative", "textContent") as string,
            allBids: await puppeteerHelper().getAllBids() as Bid[],
            numberOfBids: (await puppeteerHelper().getAllBids() as Bid[]).length,
            images: await puppeteerHelper().getAllImages(),
            endTime: await puppeteerHelper().getSelectorText(".bid-details-time-title", "textContent") as string
        };
    } else {
        pageInfo = {
            sellerName: "",
            isAuction: false,
            productName: "",
            productSold: false,
            buyNowPrice: 0,
            description: "",
            images: []
        }
    }

    console.log(pageInfo);
    console.log("Done scraping")
    return pageInfo
}

/**
 * Run cli mode if a product url is provided as a command line argument
 */
async function cli() {
    const product_url = process.argv[2];
    await getProductInfo(product_url);

    process.exit(0)
}

if (process.argv[2]) {
    cli()
}