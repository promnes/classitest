import fs from 'fs';

let c = fs.readFileSync('./client/src/pages/LibraryStore.tsx', 'utf8');
const before = c;

// 1. Add i18next import after useTranslation import
c = c.replace(
  `import { useTranslation } from 'react-i18next';`,
  `import { useTranslation } from 'react-i18next';\nimport i18next from "i18next";`
);

// 2. normalizeSharedCartProduct - outside component, use i18next.t()
c = c.replace(
  `product.title || product.nameAr || product.name || "منتج";
  const resolvedImage`,
  `product.title || product.nameAr || product.name || i18next.t("libraryStore.product");
  const resolvedImage`
);

// 3. getProductTitle - inside component, use t()
c = c.replace(
  `return product.title || product.nameAr || product.name || "منتج";
  };

  const getProductImage`,
  `return product.title || product.nameAr || product.name || t("libraryStore.product");
  };

  const getProductImage`
);

// 4. Header title
c = c.replace(
  `<h1 className="text-sm sm:text-xl font-bold hidden sm:inline">متجر المكتبات</h1>`,
  `<h1 className="text-sm sm:text-xl font-bold hidden sm:inline">{t('libraryStore.storeTitle')}</h1>`
);

// 5. Cart button label
c = c.replace(
  `<span className="hidden sm:inline">السلة</span> ({cartItemsCount})`,
  `<span className="hidden sm:inline">{t('libraryStore.cartLabel')}</span> ({cartItemsCount})`
);

// 6. Available libraries heading
c = c.replace(
  `<h2 className="text-lg font-semibold">المكتبات المتاحة</h2>`,
  `<h2 className="text-lg font-semibold">{t('libraryStore.availableLibraries')}</h2>`
);

// 7. "All" button
c = c.replace(
  `data-testid="button-all-libraries"
            >
              الكل
            </Button>`,
  `data-testid="button-all-libraries"
            >
              {t('libraryStore.all')}
            </Button>`
);

// 8. No products heading
c = c.replace(
  `<h3 className="text-lg font-semibold mb-2">لا توجد منتجات</h3>`,
  `<h3 className="text-lg font-semibold mb-2">{t('libraryStore.noProducts')}</h3>`
);

// 9. No products description
c = c.replace(
  `<p className="text-gray-500">لم يتم العثور على منتجات في هذه المكتبة</p>`,
  `<p className="text-gray-500">{t('libraryStore.noProductsInLibrary')}</p>`
);

// 10. Product price on card
c = c.replace(
  `<span className="font-bold text-blue-600">{product.price} ج.م</span>`,
  `<span className="font-bold text-blue-600">{product.price} {t('libraryStore.currency')}</span>`
);

// 11. Discount badge on card
c = c.replace(
  `خصم {product.discountPercent}%
                      </Badge>`,
  `{t('libraryStore.discountBadge', { percent: product.discountPercent })}
                      </Badge>`
);

// 12. Stock available on card
c = c.replace(
  `<span>متوفر: {product.stock}</span>`,
  `<span>{t('libraryStore.stockAvailable', { count: product.stock })}</span>`
);

// 13. Short "Add" button on card
c = c.replace(
  `<ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4 ml-1" />
                      أضف`,
  `<ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4 ml-1" />
                      {t('libraryStore.addShort')}`
);

// 14. Short "Buy" button on card
c = c.replace(
  `disabled={Number(product.stock || 0) <= 0}
                    >
                      شراء
                    </Button>`,
  `disabled={Number(product.stock || 0) <= 0}
                    >
                      {t('libraryStore.buyShort')}
                    </Button>`
);

// 15. Product detail price
c = c.replace(
  `<span className="text-2xl font-bold text-blue-600">{selectedProduct.price} ج.م</span>`,
  `<span className="text-2xl font-bold text-blue-600">{selectedProduct.price} {t('libraryStore.currency')}</span>`
);

// 16. Product detail stock
c = c.replace(
  `<Badge variant="outline">متوفر: {selectedProduct.stock}</Badge>`,
  `<Badge variant="outline">{t('libraryStore.stockAvailable', { count: selectedProduct.stock })}</Badge>`
);

// 17. Bulk discount note in product detail
c = c.replace(
  `خصم {selectedProduct.discountPercent}% عند شراء {selectedProduct.discountMinQuantity || 1} قطع أو أكثر`,
  `{t('libraryStore.bulkDiscountNote', { percent: selectedProduct.discountPercent, min: selectedProduct.discountMinQuantity || 1 })}`
);

// 18. "Buy Now" in product detail dialog
c = c.replace(
  `disabled={Number(selectedProduct.stock || 0) <= 0}
                >
                  شراء الآن
                </Button>`,
  `disabled={Number(selectedProduct.stock || 0) <= 0}
                >
                  {t('libraryStore.buyNow')}
                </Button>`
);

// 19. Cart dialog title
c = c.replace(
  `سلة المكتبات ({cartItemsCount} منتج)`,
  `{t('libraryStore.libraryCartTitle', { count: cartItemsCount })}`
);

// 20. Empty cart message
c = c.replace(
  `<p className="text-gray-500">السلة فارغة</p>`,
  `<p className="text-gray-500">{t('libraryStore.cartEmpty')}</p>`
);

// 21. Cart item price
c = c.replace(
  `<p className="text-orange-600 font-bold">{item.product.price} ج.م</p>`,
  `<p className="text-orange-600 font-bold">{item.product.price} {t('libraryStore.currency')}</p>`
);

// 22. Cart total label
c = c.replace(
  `<span>المجموع:</span>
                  <span className="text-orange-600">{cartTotal.toFixed(2)} ج.م</span>`,
  `<span>{t('libraryStore.totalLabel')}</span>
                  <span className="text-orange-600">{cartTotal.toFixed(2)} {t('libraryStore.currency')}</span>`
);

// 23. Complete purchase button in cart
c = c.replace(
  `<CreditCard className="w-4 h-4 ml-2" />
                  إتمام الشراء`,
  `<CreditCard className="w-4 h-4 ml-2" />
                  {t('libraryStore.completePurchase')}`
);

// 24. Shipping address heading
c = c.replace(
  `<MapPin className="w-4 h-4" /> عنوان الشحن`,
  `<MapPin className="w-4 h-4" /> {t('libraryStore.shippingAddress')}`
);

// 25. Payment method heading
c = c.replace(
  `<CreditCard className="w-4 h-4" /> طريقة الدفع`,
  `<CreditCard className="w-4 h-4" /> {t('libraryStore.paymentMethod')}`
);

// 26. No payment methods message
c = c.replace(
  `<p className="text-gray-500 text-sm">لا توجد طرق دفع متاحة</p>`,
  `<p className="text-gray-500 text-sm">{t('libraryStore.noPaymentMethods')}</p>`
);

// 27. Wallet payment option
c = c.replace(
  `<span>الدفع من المحفظة (الرصيد: {wallet?.balance || 0} ج.م)</span>`,
  `<span>{t('libraryStore.payFromWallet', { balance: wallet?.balance || 0 })}</span>`
);

// 28. Order summary heading
c = c.replace(
  `<h3 className="font-bold mb-3">ملخص الطلب</h3>`,
  `<h3 className="font-bold mb-3">{t('libraryStore.orderSummary')}</h3>`
);

// 29. Checkout item price (ج.م in checkout items list)
c = c.replace(
  `<span>{(parseFloat(item.product.price) * item.quantity).toFixed(2)} ج.م</span>`,
  `<span>{(parseFloat(item.product.price) * item.quantity).toFixed(2)} {t('libraryStore.currency')}</span>`
);

// 30. Checkout total
c = c.replace(
  `<span>المجموع:</span>
                  <span className="text-orange-600">{checkoutTotal.toFixed(2)} ج.م</span>`,
  `<span>{t('libraryStore.totalLabel')}</span>
                  <span className="text-orange-600">{checkoutTotal.toFixed(2)} {t('libraryStore.currency')}</span>`
);

// 31. Processing text
c = c.replace(
  `جاري المعالجة...`,
  `{t('libraryStore.processing')}`
);

// 32. Confirm purchase button
c = c.replace(
  `<Check className="w-5 h-5" /> تأكيد الشراء`,
  `<Check className="w-5 h-5" /> {t('libraryStore.confirmPurchase')}`
);

// Verify
const arabicRemaining = c.split('\n').filter(l => /[\u0600-\u06FF]/.test(l));
console.log('Arabic lines remaining:', arabicRemaining.length);
arabicRemaining.forEach(l => console.log('  ' + l.trim().substring(0, 120)));

fs.writeFileSync('./client/src/pages/LibraryStore.tsx', c, 'utf8');
console.log('LibraryStore.tsx updated successfully');
