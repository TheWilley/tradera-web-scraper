import { getProductInfo } from '../dist/tradera-web-scraper.js';

(async () => {
    const auctionInfo = await getProductInfo('https://www.tradera.com/en/item/344630/584639504/pokemon-violet-');
    console.log(auctionInfo);
    process.exit(1)
})();