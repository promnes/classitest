import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Store, Star, Package, Search, Filter, ShoppingCart, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTheme } from "@/contexts/ThemeContext";

interface Library {
  id: string;
  name: string;
  description?: string;
  address?: string;
  city?: string;
  governorate?: string;
  activityScore: number;
  isActive: boolean;
  referralCode: string;
  productCount?: number;
}

interface LibraryProduct {
  id: string;
  libraryId: string;
  name: string;
  nameAr?: string;
  description?: string;
  price: string;
  originalPrice?: string;
  image?: string;
  stock: number;
  discountPercentage?: number;
  minQuantityForDiscount?: number;
  library?: Library;
}

export default function LibraryStore() {
  const [, navigate] = useLocation();
  const { isDark } = useTheme();
  const referralCode = useMemo(() => {
    const ref = new URLSearchParams(window.location.search).get("ref")?.trim();
    return ref ? ref.toUpperCase() : "";
  }, []);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLibrary, setSelectedLibrary] = useState<string | null>(null);
  const [showProductDetail, setShowProductDetail] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<LibraryProduct | null>(null);

  const { data: referralLibraryData } = useQuery({
    queryKey: ["library-by-referral", referralCode],
    queryFn: async () => {
      const res = await fetch(`/api/store/libraries/by-referral/${encodeURIComponent(referralCode)}`);
      if (!res.ok) return null;
      const json = await res.json();
      return json?.data || null;
    },
    enabled: !!referralCode,
  });

  const { data: librariesData, isLoading: loadingLibraries } = useQuery({
    queryKey: ["store-libraries"],
    queryFn: async () => {
      const res = await fetch("/api/store/libraries");
      const json = await res.json();
      return json?.data || [];
    },
  });

  const libraries: Library[] = librariesData || [];

  useEffect(() => {
    const referralLibrary = referralLibraryData as Library | null;
    if (!referralCode || !referralLibrary?.id) return;

    setSelectedLibrary((current) => current || referralLibrary.id);
    localStorage.setItem("libraryReferralCode", referralCode);
    localStorage.setItem("libraryReferralLibraryId", referralLibrary.id);

    const clickSessionKey = `library-ref-click-${referralCode}`;
    if (sessionStorage.getItem(clickSessionKey) === "1") return;

    sessionStorage.setItem(clickSessionKey, "1");
    fetch(`/api/store/libraries/${referralLibrary.id}/referral-click`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referralCode }),
    }).catch(() => {
      sessionStorage.removeItem(clickSessionKey);
    });
  }, [referralCode, referralLibraryData]);

  const { data: productsData, isLoading: loadingProducts } = useQuery({
    queryKey: ["library-products", selectedLibrary, libraries.length],
    queryFn: async () => {
      if (selectedLibrary) {
        const res = await fetch(`/api/store/libraries/${selectedLibrary}`);
        const json = await res.json();
        return json?.data?.products || [];
      }
      const allProducts: any[] = [];
      for (const lib of libraries.slice(0, 5)) {
        const res = await fetch(`/api/store/libraries/${lib.id}`);
        const json = await res.json();
        if (json?.data?.products) {
          allProducts.push(...json.data.products.map((p: any) => ({ ...p, library: lib })));
        }
      }
      return allProducts;
    },
    enabled: libraries.length > 0 || !!selectedLibrary,
  });

  const products: LibraryProduct[] = productsData || [];

  const openProductDetail = (product: LibraryProduct) => {
    setSelectedProduct(product);
    setShowProductDetail(true);
  };

  const calculateDiscountedPrice = (product: LibraryProduct, quantity: number = 1) => {
    const basePrice = parseFloat(product.price);
    if (product.discountPercentage && product.minQuantityForDiscount && quantity >= product.minQuantityForDiscount) {
      return basePrice * (1 - product.discountPercentage / 100);
    }
    return basePrice;
  };

  return (
    <div className={`min-h-screen ${isDark ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"}`}>
      <header className={`sticky top-0 z-50 ${isDark ? "bg-gray-800" : "bg-white"} shadow-sm border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}>
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => navigate("/parent-store")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-blue-600" />
              <h1 className="text-xl font-bold">متجر المكتبات</h1>
            </div>
          </div>
          
          <div className="mt-3 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="ابحث عن منتج..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
                data-testid="input-search"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Store className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold">المكتبات المتاحة</h2>
            <Badge variant="secondary">{libraries.length}</Badge>
          </div>
          
          <div className="flex gap-3 overflow-x-auto pb-2">
            <Button
              variant={selectedLibrary === null ? "default" : "outline"}
              onClick={() => setSelectedLibrary(null)}
              className="flex-shrink-0"
              data-testid="button-all-libraries"
            >
              الكل
            </Button>
            {libraries.map((library) => (
              <Button
                key={library.id}
                variant={selectedLibrary === library.id ? "default" : "outline"}
                onClick={() => setSelectedLibrary(library.id)}
                className="flex-shrink-0"
                data-testid={`button-library-${library.id}`}
              >
                <div className="flex items-center gap-2">
                  <span>{library.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    <Star className="h-3 w-3 ml-1" />
                    {library.activityScore}
                  </Badge>
                </div>
              </Button>
            ))}
          </div>
        </section>

        {loadingProducts ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className={`h-32 ${isDark ? "bg-gray-700" : "bg-gray-200"} rounded-lg mb-3`}></div>
                  <div className={`h-4 ${isDark ? "bg-gray-700" : "bg-gray-200"} rounded w-3/4 mb-2`}></div>
                  <div className={`h-4 ${isDark ? "bg-gray-700" : "bg-gray-200"} rounded w-1/2`}></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">لا توجد منتجات</h3>
            <p className="text-gray-500">لم يتم العثور على منتجات في هذه المكتبة</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product) => (
              <Card 
                key={product.id} 
                className={`hover-elevate cursor-pointer ${isDark ? "bg-gray-800 border-gray-700" : ""}`}
                onClick={() => openProductDetail(product)}
                data-testid={`card-product-${product.id}`}
              >
                <CardContent className="p-4">
                  {product.image ? (
                    <img 
                      src={product.image} 
                      alt={product.name}
                      className="w-full h-32 object-cover rounded-lg mb-3"
                    />
                  ) : (
                    <div className={`w-full h-32 ${isDark ? "bg-gray-700" : "bg-gray-100"} rounded-lg mb-3 flex items-center justify-center`}>
                      <Package className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                  
                  <h3 className="font-semibold text-sm mb-1 line-clamp-2">
                    {product.nameAr || product.name}
                  </h3>
                  
                  {product.library && (
                    <p className="text-xs text-gray-500 mb-2">{product.library.name}</p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-600">{product.price} ج.م</span>
                    {product.discountPercentage && product.discountPercentage > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        خصم {product.discountPercentage}%
                      </Badge>
                    )}
                  </div>
                  
                  <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                    <Package className="h-3 w-3" />
                    <span>متوفر: {product.stock}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Dialog open={showProductDetail} onOpenChange={setShowProductDetail}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedProduct?.nameAr || selectedProduct?.name}</DialogTitle>
          </DialogHeader>
          
          {selectedProduct && (
            <div className="space-y-4">
              {selectedProduct.image ? (
                <img 
                  src={selectedProduct.image} 
                  alt={selectedProduct.name}
                  className="w-full h-48 object-cover rounded-lg"
                />
              ) : (
                <div className={`w-full h-48 ${isDark ? "bg-gray-700" : "bg-gray-100"} rounded-lg flex items-center justify-center`}>
                  <Package className="h-12 w-12 text-gray-400" />
                </div>
              )}
              
              {selectedProduct.description && (
                <p className="text-gray-600 dark:text-gray-300">{selectedProduct.description}</p>
              )}
              
              <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <div>
                  <span className="text-2xl font-bold text-blue-600">{selectedProduct.price} ج.م</span>
                  {selectedProduct.originalPrice && (
                    <span className="text-sm text-gray-400 line-through mr-2">{selectedProduct.originalPrice} ج.م</span>
                  )}
                </div>
                <Badge variant="outline">متوفر: {selectedProduct.stock}</Badge>
              </div>
              
              {selectedProduct.discountPercentage && selectedProduct.discountPercentage > 0 && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-sm text-green-700 dark:text-green-400">
                    خصم {selectedProduct.discountPercentage}% عند شراء {selectedProduct.minQuantityForDiscount} قطع أو أكثر
                  </p>
                </div>
              )}
              
              {selectedProduct.library && (
                <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Store className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-semibold">{selectedProduct.library.name}</p>
                    {selectedProduct.library.city && (
                      <p className="text-xs text-gray-500">{selectedProduct.library.city}</p>
                    )}
                  </div>
                </div>
              )}
              
              <Button className="w-full" size="lg" data-testid="button-add-to-cart">
                <ShoppingCart className="h-5 w-5 ml-2" />
                إضافة للسلة
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
