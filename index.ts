import puppeteer from "https://deno.land/x/puppeteer@9.0.1/mod.ts";

const stores: {
  [key: string]: {
    url: string; selector: string;
  }
} = {
  amazon: {
    url: "https://www.amazon.co.jp/dp/B08GGKZ34Z",
    selector: "#availability",
  },
  yodobashi: {
    url: "https://www.yodobashi.com/product-detail/100000001005829435/",
    selector: ".salesInfo"
  },
  sofmap: {
    url: "https://a.sofmap.com/product_detail.aspx?sku=21309019",
    selector: ".button.cart"
  }
}

async function main() {
  const browser = await puppeteer.launch({ headless: false });

  async function scrape(name: string, url: string, selector: string) {
    const page = await browser.newPage();
    await page.goto(url);
    const el = await page.$(selector);
    const text: string = await (el?.evaluate(it => it.innerText.trim() || it.value) ?? page.$("body").then(it => it?.evaluate(it => it.innerText)));
    console.log(text)
    fetch("", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: `${name} ---> ${text}` })
    });
  }

  await Promise.all(Object.entries(stores).map(([store, { url, selector }]) => scrape(store, url, selector)));

  await browser.close();

  setTimeout(main, 60 * 1000);
}

main();
