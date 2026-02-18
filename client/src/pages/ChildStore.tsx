import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { 
  Search, ShoppingCart, Star, 
  Grid3X3, List, Package, Truck, Shield, Clock, 
  Smartphone, Gamepad2, BookOpen, Dumbbell, Shirt, Book, Palette, Gift,
  X, Plus, Minus, MapPin, Check, ArrowLeft, Sparkles, Bell
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChildNotificationBell } from "@/components/ChildNotificationBell";
import { LanguageSelector } from "@/components/LanguageSelector";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { MandatoryTaskModal } from "@/components/MandatoryTaskModal";

const categoryIcons: Record<string, any> = {
  Smartphone, Gamepad2, BookOpen, Dumbbell, Shirt, Book, Palette, Gift, Package
};

interface Product {
  id: string;
  name: string;
  nameAr?: string;
  description?: string;
  price: string;
  originalPrice?: string;
  pointsPrice: number;
  image?: string;
  stock: number;
  brand?: string;
  rating?: string;
  reviewCount?: number;
  isFeatured?: boolean;
  categoryId?: string;
  category?: { id: string; name: string; nameAr: string; icon: string; color: string };
  discountPercent?: number;
  isLibraryProduct?: boolean;
  libraryId?: string;
  libraryName?: string;
}

interface Category {
  id: string;
  name: string;
  nameAr: string;
  icon: string;
  color: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

export const ChildStore = (): JSX.Element => {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();
  const token = localStorage.getItem("childToken");
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showLibraryOnly, setShowLibraryOnly] = useState(false);
  const [sortBy, setSortBy] = useState("featured");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const { data: categoriesData } = useQuery({
    queryKey: ["store-categories"],
    queryFn: async () => {
      const res = await fetch("/api/store/categories", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      return json?.data || json || [];
    },
    enabled: !!token,
    refetchInterval: token ? 60000 : false,
  });

  const { data: productsData, isLoading: loadingProducts } = useQuery({
    queryKey: ["store-products", selectedCategory, searchQuery, sortBy],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory) params.append("categoryId", selectedCategory);
      if (searchQuery) params.append("search", searchQuery);
      params.append("sort", sortBy);
      const res = await fetch(`/api/store/products?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      return json?.data || json || [];
    },
    enabled: !!token,
    refetchInterval: token ? 30000 : false,
  });

  const { data: childInfo } = useQuery({
    queryKey: ["child-info"],
    queryFn: async () => {
      const res = await fetch("/api/child/info", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      return json?.data || json;
    },
    enabled: !!token,
    refetchInterval: token ? 15000 : false,
  });

  const checkoutMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/child/store/purchase-request", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || t("childStore.notEnoughPoints"));
      }
      return res.json();
    },
    onSuccess: () => {
      setCart([]);
      setShowCheckout(false);
      queryClient.invalidateQueries({ queryKey: ["child-info"] });
      toast({
        title: t("childStore.requestSent"),
        description: t("childStore.parentWillReview"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("childStore.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const categories: Category[] = categoriesData?.data || categoriesData || [];
  const allProducts: Product[] = productsData?.data || productsData || [];
  
  // Filter by library if showLibraryOnly is true
  const products: Product[] = useMemo(() => {
    if (showLibraryOnly) {
      return allProducts.filter((p: Product) => p.isLibraryProduct);
    }
    return allProducts;
  }, [allProducts, showLibraryOnly]);

  const featuredProducts = useMemo(() => 
    products.filter((p: Product) => p.isFeatured).slice(0, 6), [products]
  );

  const cartTotalPoints = useMemo(() => 
    cart.reduce((sum, item) => sum + item.product.pointsPrice * item.quantity, 0), [cart]
  );

  const canAfford = cartTotalPoints <= (childInfo?.totalPoints || 0);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev => prev.map(item => 
      item.product.id === productId ? { ...item, quantity } : item
    ));
  };

  const handleCheckout = () => {
    cart.forEach(item => {
      checkoutMutation.mutate({
        productId: item.product.id,
        quantity: item.quantity,
      });
    });
  };

  const renderStars = (rating: string = "4.5") => {
    const stars = parseFloat(rating);
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(i => (
          <Star 
            key={i} 
            className={`w-3 h-3 ${i <= stars ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} 
          />
        ))}
      </div>
    );
  };

  const getCategoryIcon = (iconName: string) => {
    const IconComponent = categoryIcons[iconName] || Package;
    return IconComponent;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {childInfo?.id && <MandatoryTaskModal childId={childInfo.id} />}
      
      <header className="bg-gradient-to-r from-orange-500 via-orange-600 to-red-500 text-white sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-2 sm:px-4">
          <div className="flex items-center justify-between py-2 sm:py-3 gap-2">
            <button 
              onClick={() => navigate("/child-games")}
              className="flex items-center gap-1 sm:gap-2 hover:opacity-80 transition-opacity min-h-[44px] shrink-0"
              data-testid="button-back-games"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              <div className="flex items-center gap-1 sm:gap-2">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-sm sm:text-lg font-bold hidden xs:inline">كلاسيفاي ستور</span>
              </div>
            </button>

            <div className="flex-1 max-w-xl mx-1 sm:mx-4">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="ابحث..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 sm:pl-10 pr-3 py-1.5 sm:py-2 rounded-lg bg-white text-gray-800 placeholder-gray-500 border-0 text-sm min-h-[36px]"
                  data-testid="input-search"
                />
                <Search className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-3">
              <div className="text-right hidden lg:block">
                <p className="text-xs opacity-80">رصيد النقاط</p>
                <p className="font-bold flex items-center gap-1 text-sm">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  {childInfo?.totalPoints || 0}
                </p>
              </div>

              <LanguageSelector />
              <ChildNotificationBell />
              
              <button
                onClick={() => setShowCart(true)}
                className="relative p-2 sm:p-2.5 hover:bg-white/10 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                data-testid="button-open-cart"
              >
                <ShoppingCart className="w-5 h-5" />
                {cart.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-yellow-400 text-gray-900 text-xs font-bold w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-[10px] sm:text-xs">
                    {cart.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-orange-700/50 py-1.5 sm:py-2">
          <div className="max-w-7xl mx-auto px-2 sm:px-4">
            <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto scrollbar-hide pb-1">
              <button
                onClick={() => { setSelectedCategory(null); setShowLibraryOnly(false); }}
                className={`whitespace-nowrap px-2.5 sm:px-3 py-1.5 rounded-full text-xs sm:text-sm transition-colors min-h-[36px] ${
                  !selectedCategory && !showLibraryOnly ? "bg-white text-orange-600 font-bold" : "hover:bg-white/10"
                }`}
                data-testid="button-category-all"
              >
                الكل
              </button>
              <button
                onClick={() => { setSelectedCategory(null); setShowLibraryOnly(true); }}
                className={`whitespace-nowrap px-2.5 sm:px-3 py-1.5 rounded-full text-xs sm:text-sm flex items-center gap-1 sm:gap-2 transition-colors min-h-[36px] ${
                  showLibraryOnly ? "bg-purple-600 text-white font-bold" : "bg-purple-500/20 hover:bg-purple-500/30"
                }`}
                data-testid="button-category-library"
              >
                <BookOpen className="w-3 h-3 sm:w-4 sm:h-4" />
                المكتبات
              </button>
              {categories.map((cat: Category) => {
                const Icon = getCategoryIcon(cat.icon);
                return (
                  <button
                    key={cat.id}
                    onClick={() => { setSelectedCategory(cat.id); setShowLibraryOnly(false); }}
                    className={`whitespace-nowrap px-2.5 sm:px-3 py-1.5 rounded-full text-xs sm:text-sm flex items-center gap-1 sm:gap-2 transition-colors min-h-[36px] ${
                      selectedCategory === cat.id ? "bg-white text-orange-600 font-bold" : "hover:bg-white/10"
                    }`}
                    data-testid={`button-category-${cat.id}`}
                  >
                    <Icon className="w-3 h-3 sm:w-4 sm:h-4" />
                    {cat.nameAr}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      <div className="bg-white border-b shadow-sm py-1.5 sm:py-2">
        <div className="max-w-7xl mx-auto px-2 sm:px-4">
          <div className="flex items-center justify-between gap-2 text-xs text-gray-600">
            <div className="hidden sm:flex items-center gap-3 md:gap-6">
              <div className="flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-green-500" />
                <span className="text-[11px] sm:text-xs">توصيل سريع</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-[11px] sm:text-xs">ضمان الجودة</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-orange-500" />
                <span className="text-[11px] sm:text-xs">دعم 24/7</span>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-28 sm:w-36 h-8 text-xs min-h-[36px]" data-testid="select-sort">
                  <SelectValue placeholder="ترتيب" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="featured">الأكثر مبيعاً</SelectItem>
                  <SelectItem value="points_asc">النقاط: الأقل</SelectItem>
                  <SelectItem value="points_desc">النقاط: الأعلى</SelectItem>
                  <SelectItem value="newest">الأحدث</SelectItem>
                  <SelectItem value="rating">التقييم</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-0.5 border rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 sm:p-2 rounded min-h-[32px] min-w-[32px] flex items-center justify-center ${viewMode === "grid" ? "bg-orange-100 text-orange-600" : ""}`}
                  data-testid="button-view-grid"
                >
                  <Grid3X3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 sm:p-2 rounded min-h-[32px] min-w-[32px] flex items-center justify-center ${viewMode === "list" ? "bg-orange-100 text-orange-600" : ""}`}
                  data-testid="button-view-list"
                >
                  <List className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-2 sm:px-4 py-3 sm:py-6">
        {!selectedCategory && !searchQuery && featuredProducts.length > 0 && (
          <section className="mb-4 sm:mb-8">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-base sm:text-xl font-bold text-gray-800 flex items-center gap-1.5 sm:gap-2">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
                المنتجات المميزة
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4">
              {featuredProducts.map((product: Product) => (
                <Card 
                  key={product.id} 
                  className="group cursor-pointer hover:shadow-xl transition-all duration-300 overflow-hidden border-0 bg-white"
                  onClick={() => setSelectedProduct(product)}
                  data-testid={`card-featured-product-${product.id}`}
                >
                  <div className="relative aspect-square bg-gray-100 overflow-hidden">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-12 h-12 text-gray-300" />
                      </div>
                    )}
                    {(childInfo?.totalPoints || 0) >= product.pointsPrice && (
                      <Badge className="absolute top-2 right-2 bg-green-500 text-white text-xs">
                        متاح لك
                      </Badge>
                    )}
                    {product.discountPercent && product.discountPercent > 0 && (
                      <Badge className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold z-10">
                        -{product.discountPercent}%
                      </Badge>
                    )}
                    {product.isLibraryProduct && (
                      <Badge className="absolute bottom-2 left-2 bg-purple-500 text-white text-xs">
                        {product.libraryName || "مكتبة"}
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <p className="text-xs text-gray-500 mb-1">{product.brand || "Classify"}</p>
                    <h3 className="font-medium text-sm text-gray-800 line-clamp-2 mb-2">{product.nameAr || product.name}</h3>
                    <div className="flex items-center gap-1 mb-2">
                      {renderStars(product.rating)}
                      <span className="text-xs text-gray-400">({product.reviewCount || 0})</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        {product.originalPrice && parseFloat(product.originalPrice) > parseFloat(product.price) && (
                          <span className="text-xs text-gray-400 line-through">
                            {Math.round(parseFloat(product.originalPrice) * 10)} نقطة
                          </span>
                        )}
                        <div className="flex items-center gap-1 bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                          <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                          <span className="font-bold text-sm">{product.pointsPrice}</span>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        className="bg-orange-500 hover:bg-orange-600 h-8 w-8 p-0"
                        onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                        data-testid={`button-add-cart-${product.id}`}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
            <h2 className="text-base sm:text-xl font-bold text-gray-800 truncate">
              {selectedCategory 
                ? categories.find((c: Category) => c.id === selectedCategory)?.nameAr || "المنتجات"
                : searchQuery ? `نتائج: "${searchQuery}"` : "جميع المنتجات"
              }
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 shrink-0">{products.length} منتج</p>
          </div>

          {loadingProducts ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4">
              {[...Array(10)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <div className="aspect-square bg-gray-200" />
                  <CardContent className="p-3 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                    <div className="h-4 bg-gray-200 rounded" />
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-10 sm:py-16">
              <Package className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-gray-300 mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-medium text-gray-600 mb-2">لا توجد منتجات</h3>
              <p className="text-sm text-gray-400">جرب البحث بكلمات أخرى</p>
            </div>
          ) : (
            <div className={viewMode === "grid" 
              ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4"
              : "space-y-2 sm:space-y-4"
            }>
              {products.map((product: Product) => (
                viewMode === "grid" ? (
                  <Card 
                    key={product.id} 
                    className="group cursor-pointer hover:shadow-xl transition-all duration-300 overflow-hidden border-0 bg-white"
                    data-testid={`card-product-${product.id}`}
                  >
                    <div 
                      className="relative aspect-square bg-gray-100 overflow-hidden"
                      onClick={() => setSelectedProduct(product)}
                    >
                      {product.image ? (
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-12 h-12 text-gray-300" />
                        </div>
                      )}
                      {(childInfo?.totalPoints || 0) >= product.pointsPrice && (
                        <Badge className="absolute top-2 left-2 bg-green-500 text-white text-xs">
                          متاح لك
                        </Badge>
                      )}
                      {product.discountPercent && product.discountPercent > 0 && (
                        <Badge className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold">
                          -{product.discountPercent}%
                        </Badge>
                      )}
                      {product.isLibraryProduct && (
                        <Badge className="absolute bottom-2 left-2 bg-purple-500 text-white text-xs">
                          {product.libraryName || "مكتبة"}
                        </Badge>
                      )}
                    </div>
                    <CardContent className="p-3">
                      <p className="text-xs text-gray-500 mb-1">{product.brand || "Classify"}</p>
                      <h3 className="font-medium text-sm text-gray-800 line-clamp-2 mb-2 h-10">{product.nameAr || product.name}</h3>
                      <div className="flex items-center gap-1 mb-2">
                        {renderStars(product.rating)}
                        <span className="text-xs text-gray-400">({product.reviewCount || 0})</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          {product.originalPrice && parseFloat(product.originalPrice) > parseFloat(product.price) && (
                            <span className="text-xs text-gray-400 line-through">
                              {Math.round(parseFloat(product.originalPrice) * 10)} نقطة
                            </span>
                          )}
                          <div className="flex items-center gap-1 bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                            <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                            <span className="font-bold">{product.pointsPrice}</span>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          className="bg-orange-500 hover:bg-orange-600"
                          onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                          data-testid={`button-add-cart-${product.id}`}
                        >
                          <ShoppingCart className="w-4 h-4 ml-1" />
                          أضف
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card 
                    key={product.id} 
                    className="flex overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => setSelectedProduct(product)}
                    data-testid={`card-product-list-${product.id}`}
                  >
                    <div className="relative w-40 h-40 bg-gray-100 flex-shrink-0">
                      {product.image ? (
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-12 h-12 text-gray-300" />
                        </div>
                      )}
                      {product.discountPercent && product.discountPercent > 0 && (
                        <Badge className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold">
                          -{product.discountPercent}%
                        </Badge>
                      )}
                      {product.isLibraryProduct && (
                        <Badge className="absolute bottom-2 left-2 bg-purple-500 text-white text-xs">
                          {product.libraryName || "مكتبة"}
                        </Badge>
                      )}
                    </div>
                    <CardContent className="flex-1 p-4 flex flex-col justify-between">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">{product.brand || "Classify"}</p>
                        <h3 className="font-medium text-gray-800 mb-2">{product.nameAr || product.name}</h3>
                        <p className="text-sm text-gray-500 line-clamp-2">{product.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          {renderStars(product.rating)}
                          <span className="text-xs text-gray-400">({product.reviewCount || 0} تقييم)</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex flex-col">
                          {product.originalPrice && parseFloat(product.originalPrice) > parseFloat(product.price) && (
                            <span className="text-xs text-gray-400 line-through">
                              {Math.round(parseFloat(product.originalPrice) * 10)} نقطة
                            </span>
                          )}
                          <div className="flex items-center gap-2 bg-yellow-100 text-yellow-700 px-3 py-2 rounded-full">
                            <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                            <span className="font-bold text-lg">{product.pointsPrice} نقطة</span>
                          </div>
                        </div>
                        <Button 
                          className="bg-orange-500 hover:bg-orange-600"
                          onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                        >
                          <ShoppingCart className="w-4 h-4 ml-2" />
                          أضف للسلة
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              ))}
            </div>
          )}
        </section>
      </main>

      <Dialog open={showCart} onOpenChange={setShowCart}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              سلة التسوق ({cart.length} منتج)
            </DialogTitle>
          </DialogHeader>
          
          {cart.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">السلة فارغة</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {cart.map(item => (
                  <div key={item.product.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="w-16 h-16 bg-gray-200 rounded-lg flex-shrink-0 overflow-hidden">
                      {item.product.image ? (
                        <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{item.product.nameAr || item.product.name}</h4>
                      <div className="flex items-center gap-1 text-yellow-600 font-bold">
                        <Star className="w-3 h-3 fill-yellow-500" />
                        {item.product.pointsPrice} نقطة
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-8 w-8 p-0"
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-8 w-8 p-0"
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="text-red-500 h-8 w-8 p-0"
                      onClick={() => removeFromCart(item.product.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 mt-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold">المجموع:</span>
                  <div className="flex items-center gap-2 bg-yellow-100 text-yellow-700 px-4 py-2 rounded-full">
                    <Star className="w-5 h-5 fill-yellow-500 text-yellow-500" />
                    <span className="font-bold text-xl">{cartTotalPoints} نقطة</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">رصيدك الحالي:</span>
                  <span className={`font-bold ${canAfford ? "text-green-600" : "text-red-600"}`}>
                    {childInfo?.totalPoints || 0} نقطة
                  </span>
                </div>

                {!canAfford && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
                    <p className="text-red-600 font-bold mb-2">نقاطك غير كافية!</p>
                    <p className="text-red-500 text-sm mb-3">
                      تحتاج {cartTotalPoints - (childInfo?.totalPoints || 0)} نقطة إضافية
                    </p>
                    <Button
                      onClick={() => { setShowCart(false); navigate("/child-games"); }}
                      className="bg-green-500 hover:bg-green-600"
                      data-testid="button-play-games-cart"
                    >
                      <Gamepad2 className="w-4 h-4 ml-2" />
                      العب لتكسب نقاط
                    </Button>
                  </div>
                )}

                {canAfford && (
                  <Button 
                    className="w-full bg-orange-500 hover:bg-orange-600"
                    onClick={() => { setShowCart(false); setShowCheckout(true); }}
                    data-testid="button-proceed-checkout"
                  >
                    <Star className="w-4 h-4 ml-2" />
                    إتمام الشراء بالنقاط
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              {t("childStore.requestPurchase")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Bell className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="font-bold text-blue-800">{t("childStore.parentApprovalNeeded")}</p>
                  <p className="text-sm text-blue-600">{t("childStore.requestWillBeSentToParent")}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-xl">
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-500" />
                {t("childStore.paymentMethod")}
              </h3>
              <div className="flex items-center justify-between p-4 bg-white rounded-lg border-2 border-yellow-400">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                    <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  </div>
                  <div>
                    <p className="font-bold">{t("childStore.payWithPoints")}</p>
                    <p className="text-sm text-gray-500">{t("childStore.yourBalance")}: {childInfo?.totalPoints || 0} {t("childStore.points")}</p>
                  </div>
                </div>
                <Check className="w-6 h-6 text-green-500" />
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-bold mb-3">{t("childStore.orderSummary")}</h3>
              <div className="space-y-2 text-sm">
                {cart.map(item => (
                  <div key={item.product.id} className="flex justify-between">
                    <span>{item.product.nameAr || item.product.name} x{item.quantity}</span>
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-500" />
                      {item.product.pointsPrice * item.quantity}
                    </span>
                  </div>
                ))}
                <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg">
                  <span>{t("childStore.total")}:</span>
                  <span className="flex items-center gap-2 text-yellow-600">
                    <Star className="w-5 h-5 fill-yellow-500" />
                    {cartTotalPoints} {t("childStore.points")}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>{t("childStore.balanceAfterPurchase")}:</span>
                  <span className="text-green-600 font-bold">
                    {(childInfo?.totalPoints || 0) - cartTotalPoints} {t("childStore.points")}
                  </span>
                </div>
              </div>
            </div>

            <Button 
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 py-6 text-lg"
              onClick={handleCheckout}
              disabled={checkoutMutation.isPending}
              data-testid="button-confirm-checkout"
            >
              {checkoutMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t("childStore.processing")}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  {t("childStore.sendRequestToParent")} ({cartTotalPoints} {t("childStore.points")})
                </span>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-orange-500" />
              تفاصيل المنتج
            </DialogTitle>
          </DialogHeader>

          {selectedProduct && (
            <div className="space-y-6">
              <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden">
                {selectedProduct.image ? (
                  <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-16 h-16 text-gray-300" />
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1">{selectedProduct.brand || "Classify"}</p>
                <h4 className="font-bold text-xl text-gray-800">{selectedProduct.nameAr || selectedProduct.name}</h4>
                <p className="text-gray-500 mt-2">{selectedProduct.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  {renderStars(selectedProduct.rating)}
                  <span className="text-xs text-gray-400">({selectedProduct.reviewCount || 0} تقييم)</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl">
                <div>
                  <p className="text-sm text-gray-500">السعر</p>
                  <div className="flex items-center gap-2 text-2xl font-bold text-yellow-600">
                    <Star className="w-6 h-6 fill-yellow-500" />
                    {selectedProduct.pointsPrice} نقطة
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">رصيدك</p>
                  <p className={`text-xl font-bold ${(childInfo?.totalPoints || 0) >= selectedProduct.pointsPrice ? "text-green-600" : "text-red-600"}`}>
                    {childInfo?.totalPoints || 0} نقطة
                  </p>
                </div>
              </div>

              {(childInfo?.totalPoints || 0) >= selectedProduct.pointsPrice ? (
                <Button
                  className="w-full bg-orange-500 hover:bg-orange-600 py-6"
                  onClick={() => { addToCart(selectedProduct); setSelectedProduct(null); }}
                  data-testid="button-add-to-cart"
                >
                  <ShoppingCart className="w-5 h-5 ml-2" />
                  أضف للسلة
                </Button>
              ) : (
                <div className="text-center p-4 bg-red-50 rounded-xl">
                  <p className="text-red-600 font-bold mb-2">نقاطك غير كافية</p>
                  <p className="text-sm text-red-500 mb-4">
                    تحتاج {selectedProduct.pointsPrice - (childInfo?.totalPoints || 0)} نقطة إضافية
                  </p>
                  <Button
                    onClick={() => navigate("/child-games")}
                    className="bg-green-500 hover:bg-green-600"
                  >
                    <Gamepad2 className="w-4 h-4 ml-2" />
                    العب لتكسب نقاط
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChildStore;
