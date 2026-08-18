import Image from "next/image";
import Script from "next/script";

export const metadata = {
  title: "Vegan Indian Sweets Mini Ebook",
  description:
    "A beginner-friendly vegan Indian sweets ebook with 6 comforting recipes, pantry notes, troubleshooting tips, and festive serving ideas.",
};

export default function EbookPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-6xl px-6 py-12 md:px-8 lg:px-10">
        <section className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div className="order-2 lg:order-1">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-red-400">
              New Digital Ebook
            </p>

            <h1 className="mb-6 text-4xl font-bold leading-tight text-yellow-400 md:text-5xl">
              Vegan Indian Sweets Mini Ebook
            </h1>

            <p className="mb-6 text-lg leading-8 text-zinc-200">
              Make vegan Indian sweets at home with more confidence.
            </p>

            <p className="mb-6 text-base leading-8 text-zinc-300">
              This beautifully designed mini ebook brings together 6 comforting
              sweet recipes, plus pantry notes, troubleshooting tips, and
              festive serving ideas to help you make Indian sweets that feel
              warm, generous, and worth sharing.
            </p>

            <div className="mb-8 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-yellow-500/30 bg-zinc-950/60 px-4 py-3 text-sm text-zinc-200">
                6 sweet recipes
              </div>
              <div className="rounded-2xl border border-yellow-500/30 bg-zinc-950/60 px-4 py-3 text-sm text-zinc-200">
                Beginner-friendly format
              </div>
              <div className="rounded-2xl border border-yellow-500/30 bg-zinc-950/60 px-4 py-3 text-sm text-zinc-200">
                Instant PDF download
              </div>
              <div className="rounded-2xl border border-yellow-500/30 bg-zinc-950/60 px-4 py-3 text-sm text-zinc-200">
                Pantry + troubleshooting notes
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <a
                href="#buy"
                className="inline-flex rounded-full bg-red-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-600"
              >
                Get the Ebook
              </a>

              <a
                href="#inside"
                className="inline-flex rounded-full border border-yellow-500 px-6 py-3 text-sm font-semibold text-yellow-400 transition hover:bg-yellow-500/10"
              >
                Preview What&apos;s Inside
              </a>
            </div>

            <p className="mt-6 text-sm text-zinc-400">
              Instant digital download in PDF format.
            </p>
          </div>

          <div className="order-1 lg:order-2">
            <div className="mx-auto max-w-md overflow-hidden rounded-[2rem] border border-yellow-500/80 bg-zinc-950 p-4 shadow-2xl">
              <Image
                src="/images/ebook/cover.jpg"
                alt="Vegan Indian Sweets Mini Ebook cover"
                width={1600}
                height={2560}
                className="h-auto w-full rounded-[1.5rem]"
                priority
              />
            </div>
          </div>
        </section>

        <section className="mt-20 grid gap-8 rounded-[2rem] border border-yellow-500/40 bg-zinc-950/60 p-8 md:grid-cols-2">
          <div>
            <h2 className="mb-4 text-3xl font-bold text-yellow-400">
              What&apos;s Inside
            </h2>
            <p className="mb-6 leading-8 text-zinc-300">
              A small but carefully chosen collection of vegan Indian sweets and
              sweet treats, designed to feel approachable, practical, and
              genuinely useful in a real kitchen.
            </p>
            <ul className="space-y-3 text-zinc-200">
              <li>• Jalebi</li>
              <li>• Vegan Gulab Jamun</li>
              <li>• Coconut Ladoo</li>
              <li>• Kheer</li>
              <li>• Carrot Halwa</li>
              <li>• Mango Lassi</li>
              <li>• Pantry essentials for vegan Indian sweets</li>
              <li>• Troubleshooting common problems</li>
              <li>• Festive serving ideas</li>
            </ul>
          </div>

          <div>
            <h2 className="mb-4 text-3xl font-bold text-yellow-400">
              Who It&apos;s For
            </h2>
            <p className="leading-8 text-zinc-300">
              This ebook is for home cooks who want a warm, approachable
              introduction to vegan Indian sweets. It&apos;s especially helpful
              if you want something more curated than loose online recipes, more
              beautiful than scattered notes, and easier to come back to when
              you want to make something sweet for a celebration, family meal,
              or quiet weekend at home.
            </p>
          </div>
        </section>

        <section id="inside" className="mt-20">
          <h2 className="mb-4 text-3xl font-bold text-yellow-400">
            A Look Inside
          </h2>
          <p className="mb-8 max-w-3xl leading-8 text-zinc-300">
            Inside the ebook, you&apos;ll find beautifully designed recipe
            spreads, clear ingredient and method pages, helpful timing notes,
            and practical details to make each recipe feel more manageable and
            rewarding.
          </p>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="overflow-hidden rounded-[1.5rem] border border-yellow-500/50 bg-zinc-950 p-3">
              <Image
                src="/images/ebook/contents.jpg"
                alt="Ebook contents page preview"
                width={1200}
                height={1600}
                className="h-auto w-full rounded-[1rem]"
              />
            </div>

            <div className="overflow-hidden rounded-[1.5rem] border border-yellow-500/50 bg-zinc-950 p-3">
              <Image
                src="/images/ebook/jalebi-intro.jpg"
                alt="Jalebi intro page preview"
                width={1200}
                height={1600}
                className="h-auto w-full rounded-[1rem]"
              />
            </div>

            <div className="overflow-hidden rounded-[1.5rem] border border-yellow-500/50 bg-zinc-950 p-3">
              <Image
                src="/images/ebook/jalebi-recipe-1.jpg"
                alt="Jalebi recipe page preview"
                width={1200}
                height={1600}
                className="h-auto w-full rounded-[1rem]"
              />
            </div>
          </div>
        </section>

        <section className="mt-20 grid gap-8 rounded-[2rem] border border-yellow-500/40 bg-zinc-950/60 p-8 md:grid-cols-2">
          <div>
            <h2 className="mb-4 text-3xl font-bold text-yellow-400">
              Why This Ebook
            </h2>
            <p className="mb-6 leading-8 text-zinc-300">
              Rather than jumping between tabs or piecing together scattered
              recipes, this ebook gives you one polished, easy-to-follow guide
              you can actually keep and reuse. It&apos;s designed to feel more
              curated, more usable, and more giftable than a loose collection of
              recipe notes.
            </p>

            <ul className="space-y-3 text-zinc-200">
              <li>• Beautifully designed PDF format</li>
              <li>• Beginner-friendly structure</li>
              <li>• Vegan-friendly ingredients</li>
              <li>• Practical notes you can actually use</li>
              <li>• Great for festive cooking and gifting</li>
              <li>• Instant digital download</li>
            </ul>
          </div>

          <div
            id="buy"
            className="rounded-[1.5rem] border border-yellow-500/50 bg-black/50 p-6"
          >
            <h2 className="mb-4 text-3xl font-bold text-yellow-400">
              Get the Ebook
            </h2>
            <p className="mb-4 leading-8 text-zinc-300">
              Buy once and keep it ready for whenever you want to make
              something sweet, comforting, and worth sharing.
            </p>

            <div className="mb-6 rounded-2xl border border-yellow-500/30 bg-zinc-950/60 p-4">
              <p className="text-sm uppercase tracking-[0.16em] text-zinc-400">
                You&apos;ll get
              </p>
              <ul className="mt-3 space-y-2 text-sm leading-7 text-zinc-200">
                <li>• 6 vegan Indian sweet recipes</li>
                <li>• Pantry notes and ingredient help</li>
                <li>• Troubleshooting tips</li>
                <li>• Festive serving inspiration</li>
                <li>• Instant PDF delivery by email</li>
              </ul>
            </div>

            <div className="mb-4 text-2xl font-bold text-white">£7.00</div>

            <div className="flex justify-center">
              <div className="inline-block">
                <div
                  id="product-component-1774981931178"
                  className="flex justify-center"
                />
              </div>
            </div>

            <p className="mt-4 text-sm text-zinc-500">
              Delivered instantly after purchase.
            </p>
          </div>
        </section>

        <section className="mt-20 rounded-[2rem] border border-yellow-500/40 bg-zinc-950/60 p-8 text-center">
          <h2 className="mb-4 text-3xl font-bold text-yellow-400">
            Ready to make vegan Indian sweets at home?
          </h2>
          <p className="mx-auto max-w-3xl leading-8 text-zinc-300">
            Download the Vegan Indian Sweets Mini Ebook and keep a beautiful,
            practical collection of sweet recipes ready for whenever you want to
            cook something warm, nostalgic, and worth sharing.
          </p>

          <div className="mt-8">
            <a
              href="#buy"
              className="inline-flex rounded-full bg-red-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-600"
            >
              Buy the Ebook for £7
            </a>
          </div>
        </section>

        <section className="mt-20">
          <h2 className="mb-8 text-3xl font-bold text-yellow-400">
            Frequently Asked Questions
          </h2>

          <div className="space-y-6">
            <div className="rounded-[1.5rem] border border-yellow-500/30 bg-zinc-950/50 p-6">
              <h3 className="mb-2 text-xl font-semibold text-white">
                What format is the ebook in?
              </h3>
              <p className="leading-8 text-zinc-300">
                The ebook is delivered as a downloadable PDF.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-yellow-500/30 bg-zinc-950/50 p-6">
              <h3 className="mb-2 text-xl font-semibold text-white">
                Will I receive it straight away?
              </h3>
              <p className="leading-8 text-zinc-300">
                Yes. Once your purchase is complete, you&apos;ll receive a
                download link by email.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-yellow-500/30 bg-zinc-950/50 p-6">
              <h3 className="mb-2 text-xl font-semibold text-white">
                Are all the recipes vegan?
              </h3>
              <p className="leading-8 text-zinc-300">
                Yes. Every recipe in the ebook is written using vegan
                ingredients.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-yellow-500/30 bg-zinc-950/50 p-6">
              <h3 className="mb-2 text-xl font-semibold text-white">
                Is it suitable for beginners?
              </h3>
              <p className="leading-8 text-zinc-300">
                Yes. The ebook is written for home cooks and includes practical
                notes, timing guidance, and troubleshooting help.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-20 rounded-[2rem] border border-yellow-500/40 bg-zinc-950/60 p-8 text-center">
          <p className="mx-auto max-w-3xl leading-8 text-zinc-300">
            Whether you&apos;re making something for a festive table, an
            afternoon with chai, or a quiet dessert at home, I hope this little
            collection brings warmth and sweetness to your kitchen.
          </p>
        </section>
      </div>

      <Script
        id="shopify-buy-button-script"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function () {
              var scriptURL = 'https://sdks.shopifycdn.com/buy-button/latest/buy-button-storefront.min.js';
              if (window.ShopifyBuy) {
                if (window.ShopifyBuy.UI) {
                  ShopifyBuyInit();
                } else {
                  loadScript();
                }
              } else {
                loadScript();
              }

              function loadScript() {
                var script = document.createElement('script');
                script.async = true;
                script.src = scriptURL;
                (document.getElementsByTagName('head')[0] || document.getElementsByTagName('body')[0]).appendChild(script);
                script.onload = ShopifyBuyInit;
              }

              function ShopifyBuyInit() {
                var client = window.ShopifyBuy.buildClient({
                  domain: 'wz2ryc-0k.myshopify.com',
                  storefrontAccessToken: '8bd36cdc7a5878be0b0eb30c17626a64',
                });

                window.ShopifyBuy.UI.onReady(client).then(function (ui) {
                  ui.createComponent('product', {
                    id: '15512163320132',
                    node: document.getElementById('product-component-1774981931178'),
                    moneyFormat: '%C2%A3%7B%7Bamount%7D%7D',
                    options: {
                      product: {
                        styles: {
                          product: {
                            "width": "auto",
                            "margin-left": "0px",
                            "margin-right": "0px",
                            "margin-bottom": "0px",
                            "@media (min-width: 601px)": {
                              "width": "auto",
                              "max-width": "none",
                              "margin-left": "0px",
                              "margin-right": "0px",
                              "margin-bottom": "0px"
                            }
                          },
                          button: {
                            "font-family": "'Rajdhani', Arial, sans-serif",
                            "font-size": "17px",
                            "padding-top": "16.5px",
                            "padding-bottom": "16.5px",
                            "color": "#000000",
                            ":hover": {
                              "color": "#000000",
                              "background-color": "#e4c74d"
                            },
                            "background-color": "#fddd56",
                            ":focus": {
                              "background-color": "#e4c74d"
                            },
                            "border-radius": "14px",
                            "padding-left": "80px",
                            "padding-right": "80px"
                          },
                          quantityInput: {
                            "font-size": "17px",
                            "padding-top": "16.5px",
                            "padding-bottom": "16.5px"
                          }
                        },
                        contents: {
                          img: false,
                          title: false,
                          price: false
                        },
                        text: {
                          button: "Add to cart"
                        }
                      },
                      productSet: {
                        styles: {
                          products: {
                            "justify-content": "center",
                            "@media (min-width: 601px)": {
                              "margin-left": "0px",
                              "justify-content": "center"
                            }
                          }
                        }
                      },
                      modalProduct: {
                        contents: {
                          img: false,
                          imgWithCarousel: true,
                          button: false,
                          buttonWithQuantity: true
                        },
                        styles: {
                          product: {
                            "@media (min-width: 601px)": {
                              "max-width": "100%",
                              "margin-left": "0px",
                              "margin-bottom": "0px"
                            }
                          },
                          button: {
                            "font-family": "'Rajdhani', Arial, sans-serif",
                            "font-size": "17px",
                            "padding-top": "16.5px",
                            "padding-bottom": "16.5px",
                            "color": "#000000",
                            ":hover": {
                              "color": "#000000",
                              "background-color": "#e4c74d"
                            },
                            "background-color": "#fddd56",
                            ":focus": {
                              "background-color": "#e4c74d"
                            },
                            "border-radius": "14px",
                            "padding-left": "80px",
                            "padding-right": "80px"
                          },
                          quantityInput: {
                            "font-size": "17px",
                            "padding-top": "16.5px",
                            "padding-bottom": "16.5px"
                          }
                        },
                        text: {
                          button: "Add to cart"
                        }
                      },
                      option: {},
                      cart: {
                        styles: {
                          button: {
                            "font-family": "'Rajdhani', Arial, sans-serif",
                            "font-size": "17px",
                            "padding-top": "16.5px",
                            "padding-bottom": "16.5px",
                            "color": "#000000",
                            ":hover": {
                              "color": "#000000",
                              "background-color": "#e4c74d"
                            },
                            "background-color": "#fddd56",
                            ":focus": {
                              "background-color": "#e4c74d"
                            },
                            "border-radius": "14px"
                          },
                          title: {
                            "color": "#faff68"
                          },
                          header: {
                            "color": "#faff68"
                          },
                          lineItems: {
                            "color": "#faff68"
                          },
                          subtotalText: {
                            "color": "#faff68"
                          },
                          subtotal: {
                            "color": "#faff68"
                          },
                          notice: {
                            "color": "#faff68"
                          },
                          currency: {
                            "color": "#faff68"
                          },
                          close: {
                            "color": "#faff68",
                            ":hover": {
                              "color": "#faff68"
                            }
                          },
                          empty: {
                            "color": "#faff68"
                          },
                          noteDescription: {
                            "color": "#faff68"
                          },
                          discountText: {
                            "color": "#faff68"
                          },
                          discountIcon: {
                            "fill": "#faff68"
                          },
                          discountAmount: {
                            "color": "#faff68"
                          },
                          cart: {
                            "background-color": "#080707"
                          },
                          footer: {
                            "background-color": "#080707"
                          }
                        },
                        text: {
                          total: "Subtotal",
                          button: "Checkout"
                        }
                      },
                      toggle: {
                        styles: {
                          toggle: {
                            "font-family": "'Rajdhani', Arial, sans-serif",
                            "background-color": "#fddd56",
                            ":hover": {
                              "background-color": "#e4c74d"
                            },
                            ":focus": {
                              "background-color": "#e4c74d"
                            }
                          },
                          count: {
                            "font-size": "17px",
                            "color": "#000000",
                            ":hover": {
                              "color": "#000000"
                            }
                          },
                          iconPath: {
                            "fill": "#000000"
                          }
                        }
                      },
                      lineItem: {
                        styles: {
                          variantTitle: {
                            "color": "#faff68"
                          },
                          title: {
                            "color": "#faff68"
                          },
                          price: {
                            "color": "#faff68"
                          },
                          fullPrice: {
                            "color": "#faff68"
                          },
                          discount: {
                            "color": "#faff68"
                          },
                          discountIcon: {
                            "fill": "#faff68"
                          },
                          quantity: {
                            "color": "#faff68"
                          },
                          quantityIncrement: {
                            "color": "#faff68",
                            "border-color": "#faff68"
                          },
                          quantityDecrement: {
                            "color": "#faff68",
                            "border-color": "#faff68"
                          },
                          quantityInput: {
                            "color": "#faff68",
                            "border-color": "#faff68"
                          }
                        }
                      }
                    }
                  });
                });
              }
            })();
          `,
        }}
      />
    </main>
  );
}
