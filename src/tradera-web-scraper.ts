//Puppeteer library
const pt = require("puppeteer");
let browserInstance: Page;

// Bid is a bid on an auction
interface Bid {
    bidder: string;
    bid: number;
    time: number;
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
    highestBid: number;
    latestBid: Bid
    numberOfBids: number;

    // Time information
    timeLeft: number;
    endTime: number;

    // Buy now information
    buyNowPrice: number;
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
        getSelectorText: async (selector: string, callback?: (_result_: string) => unknown, callbackError?: (_result_: string) => unknown) => {
            // To make the variable available in the catch block
            var _result_;

            // Try to get the text from the selector
            try {
                _result_ = await browserInstance.evaluate((selector: string) => {
                    const element = document.querySelector(selector);

                    return (element as HTMLElement).innerText;
                }, selector);

                // Check if callback is defined and return result
                if (callback)
                    return callback(_result_);
                else
                    return _result_;
            } catch (e) {
                if (callbackError) return callbackError(_result_)
                else return undefined;
            }

        },
        getAllBids: async (callback?: (_result_: Bid[]) => unknown) => {
            // Open bid history
            await browserInstance.click(".bid-details-bids-title > span > a");
            await browserInstance.waitForSelector(".bid-details-bids-title > span > a");

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
                        bid: parseFloat(bid.replace("kr", "")),
                        time: Date.parse(time)
                    });
                });

                return bids;
            });

            // Close bid history
            await browserInstance.click(".bid-details-bids-title > span > a");

            // Check if callback is defined and return result
            if (callback)
                return callback(_result_);
            else
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
    if (!browserInstance.url().includes("item")) {
        console.log("Not an product page (page might have been removed)");
        process.exit(0);
    }

    // Check if page is not found and exit if not
    if (await browserInstance.evaluate(() => { document.querySelector(".not-found-container") == undefined ? true : false })) {
        console.log("Page returned 404");
        process.exit(0);
    }

    // Attempt to accept cookies
    try {
        await browserInstance.waitForSelector("#qc-cmp2-ui > div.qc-cmp2-footer.qc-cmp2-footer-overlay.qc-cmp2-footer-scrolled > div > button.css-14ubilm");
        await browserInstance.click("#qc-cmp2-ui > div.qc-cmp2-footer.qc-cmp2-footer-overlay.qc-cmp2-footer-scrolled > div > button.css-14ubilm");
    } catch (e) {
        console.log("Could not click accept cookies");
    }
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
    if (product_url == undefined || !isValidUrl(product_url) || !/^.*tradera\.(com|se)\/item.*$/.test(product_url)) {
        console.log("No product url provided, invalid url or url is not a tradera item");
        process.exit(0);
    }
    // Launch browser in headless mode
    const browser = await pt.launch();
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
    if (await puppeteerHelper().getSelectorText(".bid-details-time-title")) {
        return "auction"
    } else {
        return "product"
    }
}

/**
 * Get product information
 */
async function getProductInfo(product_url: string) {
    var pageInfo: PageInfo;

    // Start browser
    await startBrowser(product_url);

    // TODO: Make all selectors use jsselector from chromiun dev tools instead of css selectors (they are more reliable)
    if (await getItemType() == "auction") {
        pageInfo = {
            sellerName: await puppeteerHelper().getSelectorText(".seller-alias"),
            isAuction: await puppeteerHelper().getSelectorText(".bid-details-bids-title", (result) => { return result.includes("Bud") ? true : false; }),
            aucutionName: await puppeteerHelper().getSelectorText("#view-item-main"),
            auctionEnded: await puppeteerHelper().getSelectorText(".my-auto > .heading-london", (result) => { return result.includes("Avslutad") ? true : false; }),
            allBids: await puppeteerHelper().getAllBids(),
            numberOfBids: (await puppeteerHelper().getAllBids()).length,
            highestBid: await puppeteerHelper().getSelectorText(".bid-details-amount > span > span", (result) => { return Number(result.replace(/[^0-9.]/g, "")); }),
            timeLeft: await puppeteerHelper().getSelectorText("div.flex-md-row:nth-child(2) > div:nth-child(2) > p:nth-child(1)", (result) => { return result != "Avslutad" ? result : 0; }),
            latestBid: await puppeteerHelper().getAllBids((result) => { return result[0]; }),
            buyNowPrice: await puppeteerHelper().getSelectorText("button.btn-md:nth-child(3)", (result) => { return Number(result.replace(/[^0-9.]/g, "")); }, () => { return 0 }),
            buyNowAvailable: await puppeteerHelper().getSelectorText("button.btn-md:nth-child(3)", (result) => { return true; }, () => { return false }),
            description: await puppeteerHelper().getSelectorText(".overflow-hidden.text-break.position-relative"),
            images: await puppeteerHelper().getAllImages(),
            endTime: await puppeteerHelper().getSelectorText("#collapsed_auction_details > div > aside > div.separators_sm-separator__lOmzL.pb-md-2.mb-md-2 > section.bid-details.d-flex.flex-md-column.justify-content-between.py-1.pt-md-0.pb-md-2 > div.d-flex.flex-column.flex-md-row.justify-content-between.mb-md-2.text-center > div.mb-1.mb-md-0 > p", (result) => { return result.replace("Avslutas ", ""); })
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
    process.exit(0);
}

// Check if the module is being executed as the main module or not
if (require.main === module) {
    // If the module is being executed as the main module,
    // call getProductInfo with the first command line argument
    const product_url = process.argv[2];
    getProductInfo(product_url);
} else {
    // If the module is being required as a library,
    // export the getProductInfo function
    module.exports = { getProductInfo: getProductInfo };
}