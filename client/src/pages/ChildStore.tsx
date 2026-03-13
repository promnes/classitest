import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, ShoppingCart, Star, 
  Grid3X3, List, Package, Truck, Shield, Clock, 
  Smartphone, Gamepad2, BookOpen, Dumbbell, Shirt, Book, Palette, Gift,
  X, Plus, Minus, MapPin, Check, ArrowLeft, ArrowRight, Sparkles, Bell, ChevronDown, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { MandatoryTaskModal } from "@/components/MandatoryTaskModal";
import { ProductImageCarousel } from "@/components/ProductImageCarousel";
import { ChildBottomNav } from "@/components/ChildBottomNav";

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
  images?: string[];
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
  parentId: string | null;
  name: string;
  nameAr: string;
  namePt: string | null;
  targetAudience?: "all" | "parents" | "children" | "fathers" | "mothers";
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
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const token = localStorage.getItem("childToken");
  const isGuest = !token;
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedMainCategory, setExpandedMainCategory] = useState<string | null>(null);
  const [showLibraryOnly, setShowLibraryOnly] = useState(false);
  const [sortBy, setSortBy] = useState("featured");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const getAuthHeaders = (): Record<string, string> => {
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  };

  const redirectToRequiredRegistration = () => {
    toast({
      title: t("childStore.askParentToRegister"),
      description: t("childStore.askParentToRegisterDesc"),
    });
    navigate("/child-link");
  };

  const { data: categoriesData } = useQuery({
    queryKey: ["store-categories"],
    queryFn: async () => {
      const res = await fetch("/api/store/categories", {
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      return json?.data || json || [];
    },
    enabled: true,
    refetchInterval: 60000,
  });

  const { data: productsData, isLoading: loadingProducts } = useQuery({
    queryKey: ["store-products", selectedCategory, searchQuery, sortBy],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory) params.append("categoryId", selectedCategory);
      if (searchQuery) params.append("search", searchQuery);
      params.append("sort", sortBy);
      const res = await fetch(`/api/store/products?${params}`, {
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      return json?.data || json || [];
    },
    enabled: true,
    refetchInterval: 30000,
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
  const mainCategories = useMemo(() => categories.filter(c => !c.parentId), [categories]);
  const getSubcategories = (parentId: string) => categories.filter(c => c.parentId === parentId);
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

  const canAfford = isGuest ? true : cartTotalPoints <= (childInfo?.totalPoints || 0);

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
    if (!token) {
      redirectToRequiredRegistration();
      return;
    }
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

  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24" dir={isRTL ? "rtl" : "ltr"}>
      {childInfo?.id && <MandatoryTaskModal childId={childInfo.id} />}
      
      <header className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 text-white sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-2 sm:px-4">
          <div className="flex items-center justify-between py-2 sm:py-3 gap-2">
            <button 
              onClick={() => window.history.length > 1 ? window.history.back() : navigate("/child-games")}
              className="flex items-center gap-1 sm:gap-2 hover:opacity-80 transition-opacity min-h-[44px] shrink-0"
              data-testid="button-back-games"
            >
              <BackArrow className="w-4 h-4 sm:w-5 sm:h-5" />
              <div className="flex items-center gap-1 sm:gap-2">
                <span className="text-xl">🛍️</span>
                <span className="text-sm sm:text-lg font-bold hidden xs:inline">{t("childStore.storeName")}</span>
              </div>
            </button>

            <div className="flex-1 max-w-xl mx-1 sm:mx-4">
              <div className="relative">
                <Input
                  type="text"
                  placeholder={t('childStore.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full ps-8 sm:ps-10 pe-3 py-1.5 sm:py-2 rounded-xl bg-white/90 dark:bg-gray-700 text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 border-0 text-sm min-h-[36px] backdrop-blur-sm"
                  data-testid="input-search"
                />
                <Search className="absolute start-2 sm:start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-3">
              <div className="hidden lg:flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-xl px-3 py-1.5">
                <span className="text-lg">⭐</span>
                <div>
                  <p className="text-[10px] opacity-80">{t("childStore.pointsBalance")}</p>
                  <p className="font-bold text-sm">{childInfo?.totalPoints || 0}</p>
                </div>
              </div>
              
              <button
                onClick={() => setShowCart(true)}
                className="relative p-2 sm:p-2.5 hover:bg-white/20 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center backdrop-blur-sm"
                data-testid="button-open-cart"
              >
                <ShoppingCart className="w-5 h-5" />
                {cart.length > 0 && (
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-0.5 -end-0.5 bg-yellow-400 text-gray-900 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
                  >
                    {cart.length}
                  </motion.span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Wave separator */}
        <div className="relative -mb-1">
          <svg viewBox="0 0 1440 40" className="w-full h-6 sm:h-8 text-orange-600/50" preserveAspectRatio="none">
            <path fill="currentColor" d="M0,20 C360,40 720,0 1080,20 C1260,30 1380,15 1440,20 L1440,0 L0,0 Z" />
          </svg>
        </div>

        <div className="bg-orange-600/50 backdrop-blur-sm py-1.5 sm:py-2">
          <div className="max-w-7xl mx-auto px-2 sm:px-4">
            {/* Main categories row */}
            <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto scrollbar-hide pb-1">
              <button
                onClick={() => { setSelectedCategory(null); setExpandedMainCategory(null); setShowLibraryOnly(false); }}
                className={`whitespace-nowrap px-2.5 sm:px-3 py-1.5 rounded-full text-xs sm:text-sm transition-colors min-h-[36px] ${
                  !selectedCategory && !showLibraryOnly && !expandedMainCategory ? "bg-white text-orange-600 font-bold" : "hover:bg-white/10"
                }`}
                data-testid="button-category-all"
              >
                {t("childStore.all")}
              </button>
              <button
                onClick={() => { setSelectedCategory(null); setExpandedMainCategory(null); setShowLibraryOnly(true); }}
                className={`whitespace-nowrap px-2.5 sm:px-3 py-1.5 rounded-full text-xs sm:text-sm flex items-center gap-1 sm:gap-2 transition-colors min-h-[36px] ${
                  showLibraryOnly ? "bg-purple-600 text-white font-bold" : "bg-purple-500/20 hover:bg-purple-500/30"
                }`}
                data-testid="button-category-library"
              >
                <BookOpen className="w-3 h-3 sm:w-4 sm:h-4" />
                {t("childStore.libraries")}
              </button>
              {mainCategories.map((cat: Category) => {
                const Icon = getCategoryIcon(cat.icon);
                const subs = getSubcategories(cat.id);
                const isExpanded = expandedMainCategory === cat.id;
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setShowLibraryOnly(false);
                      if (subs.length > 0) {
                        if (isExpanded) {
                          setExpandedMainCategory(null);
                          setSelectedCategory(null);
                        } else {
                          setExpandedMainCategory(cat.id);
                          setSelectedCategory(cat.id);
                        }
                      } else {
                        setExpandedMainCategory(null);
                        setSelectedCategory(cat.id);
                      }
                    }}
                    className={`whitespace-nowrap px-2.5 sm:px-3 py-1.5 rounded-full text-xs sm:text-sm flex items-center gap-1 sm:gap-2 transition-colors min-h-[36px] ${
                      isSelected || isExpanded ? "bg-white text-orange-600 font-bold" : "hover:bg-white/10"
                    }`}
                    data-testid={`button-category-${cat.id}`}
                  >
                    <Icon className="w-3 h-3 sm:w-4 sm:h-4" />
                    {i18n.language === "ar" ? cat.nameAr : i18n.language === "pt" && cat.namePt ? cat.namePt : cat.name}
                    {subs.length > 0 && (
                      <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Subcategories row */}
            {expandedMainCategory && getSubcategories(expandedMainCategory).length > 0 && (
              <div className="flex items-center gap-2 mt-1.5 overflow-x-auto scrollbar-hide pb-1">
                <button
                  onClick={() => setSelectedCategory(expandedMainCategory)}
                  className={`whitespace-nowrap px-2.5 py-1 rounded-full text-xs transition-colors border min-h-[32px] ${
                    selectedCategory === expandedMainCategory 
                      ? "bg-white text-orange-600 font-bold border-white" 
                      : "border-white/30 hover:bg-white/10"
                  }`}
                >
                  {t("childStore.all")}
                </button>
                {getSubcategories(expandedMainCategory).map((sub: Category) => {
                  const SubIcon = getCategoryIcon(sub.icon);
                  return (
                    <button
                      key={sub.id}
                      onClick={() => setSelectedCategory(sub.id)}
                      className={`whitespace-nowrap px-2.5 py-1 rounded-full text-xs flex items-center gap-1.5 transition-colors border min-h-[32px] ${
                        selectedCategory === sub.id 
                          ? "bg-white text-orange-600 font-bold border-white" 
                          : "border-white/30 hover:bg-white/10"
                      }`}
                      data-testid={`button-subcategory-${sub.id}`}
                    >
                      <SubIcon className="w-3 h-3" />
                      {i18n.language === "ar" ? sub.nameAr : i18n.language === "pt" && sub.namePt ? sub.namePt : sub.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 shadow-sm py-1.5 sm:py-2">
        <div className="max-w-7xl mx-auto px-2 sm:px-4">
          <div className="flex items-center justify-between gap-2 text-xs text-gray-600 dark:text-gray-400">
            <div className="hidden sm:flex items-center gap-3 md:gap-6">
              <div className="flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-green-500" />
                <span className="text-[11px] sm:text-xs">{t("childStore.fastDelivery")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-[11px] sm:text-xs">{t("childStore.qualityGuarantee")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-orange-500" />
                <span className="text-[11px] sm:text-xs">{t("childStore.support247")}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-28 sm:w-36 h-8 text-xs min-h-[36px]" data-testid="select-sort">
                  <SelectValue placeholder={t('childStore.sortPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="featured">{t("childStore.bestSelling")}</SelectItem>
                  <SelectItem value="points_asc">{t("childStore.pointsLowest")}</SelectItem>
                  <SelectItem value="points_desc">{t("childStore.pointsHighest")}</SelectItem>
                  <SelectItem value="newest">{t("childStore.newest")}</SelectItem>
                  <SelectItem value="rating">{t("childStore.rating")}</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-0.5 border dark:border-gray-700 rounded-lg p-0.5">
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
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 sm:mb-8"
          >
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-base sm:text-xl font-bold text-gray-800 dark:text-white flex items-center gap-1.5 sm:gap-2">
                <span className="text-xl">✨</span>
                {t("childStore.featuredProducts")}
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4">
              {featuredProducts.map((product: Product, index: number) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.97 }}
                >
                <Card 
                  className="group cursor-pointer hover:shadow-xl transition-all duration-300 overflow-hidden border-0 bg-white dark:bg-gray-800 rounded-2xl"
                  onClick={() => setSelectedProduct(product)}
                  data-testid={`card-featured-product-${product.id}`}
                >
                  <div className="relative aspect-square bg-gray-100 dark:bg-gray-700 overflow-hidden">
                    {(product.images && product.images.length > 1) ? (
                      <ProductImageCarousel
                        images={product.images}
                        mainImage={product.image}
                        alt={product.name}
                        className="w-full h-full"
                        compact
                        hoverArrows
                        autoSlide
                        autoSlideInterval={2000}
                      />
                    ) : product.image ? (
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-12 h-12 text-gray-300" />
                      </div>
                    )}
                    {(childInfo?.totalPoints || 0) >= product.pointsPrice && (
                      <Badge className="absolute top-2 end-2 bg-green-500 text-white text-xs">
                        {t("childStore.availableToYou")}
                      </Badge>
                    )}
                    {product.discountPercent && product.discountPercent > 0 && (
                      <Badge className="absolute top-2 start-2 bg-red-500 text-white text-xs font-bold z-10">
                        -{product.discountPercent}%
                      </Badge>
                    )}
                    {product.isLibraryProduct && (
                      <Badge className="absolute bottom-2 start-2 bg-purple-500 text-white text-xs">
                        {product.libraryName || t('childStore.library')}
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{product.brand || "Classify"}</p>
                    <h3 className="font-medium text-sm text-gray-800 dark:text-white line-clamp-2 mb-2">{product.nameAr || product.name}</h3>
                    <div className="flex items-center gap-1 mb-2">
                      {renderStars(product.rating)}
                      <span className="text-xs text-gray-400">({product.reviewCount || 0})</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        {product.originalPrice && parseFloat(product.originalPrice) > parseFloat(product.price) && (
                          <span className="text-xs text-gray-400 line-through">
                            {Math.round(parseFloat(product.originalPrice) * 10)} {t("childStore.point")}
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
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        <section>
          <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
            <h2 className="text-base sm:text-xl font-bold text-gray-800 dark:text-white truncate">
              {selectedCategory 
                ? (() => { const c = categories.find((c: Category) => c.id === selectedCategory); return c ? (i18n.language === "ar" ? c.nameAr : i18n.language === "pt" && c.namePt ? c.namePt : c.name) : t('childStore.products'); })()
                : searchQuery ? t('childStore.searchResults', { query: searchQuery }) : t('childStore.allProducts')
              }
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 shrink-0">{products.length} {t("childStore.productUnit")}</p>
          </div>

          {loadingProducts ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
              <p className="text-gray-500 dark:text-gray-400 animate-pulse">{t("childStore.allProducts")}...</p>
            </div>
          ) : products.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-10 sm:py-16"
            >
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="text-5xl sm:text-6xl mb-4"
              >
                📦
              </motion.div>
              <h3 className="text-base sm:text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">{t("childStore.noProducts")}</h3>
              <p className="text-sm text-gray-400">{t("childStore.tryDifferentSearch")}</p>
            </motion.div>
          ) : (
            <div className={viewMode === "grid" 
              ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4"
              : "space-y-2 sm:space-y-4"
            }>
              {products.map((product: Product, index: number) => (
                viewMode === "grid" ? (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    whileHover={{ y: -4 }}
                    whileTap={{ scale: 0.97 }}
                  >
                  <Card 
                    className="group cursor-pointer hover:shadow-xl transition-all duration-300 overflow-hidden border-0 bg-white dark:bg-gray-800 rounded-2xl"
                    data-testid={`card-product-${product.id}`}
                  >
                    <div 
                      className="relative aspect-square bg-gray-100 dark:bg-gray-700 overflow-hidden"
                      onClick={() => setSelectedProduct(product)}
                    >
                      {(product.images && product.images.length > 1) ? (
                        <ProductImageCarousel
                          images={product.images}
                          mainImage={product.image}
                          alt={product.name}
                          className="w-full h-full"
                          compact
                          hoverArrows
                          autoSlide
                          autoSlideInterval={2000}
                        />
                      ) : product.image ? (
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-12 h-12 text-gray-300" />
                        </div>
                      )}
                      {(childInfo?.totalPoints || 0) >= product.pointsPrice && (
                        <Badge className="absolute top-2 start-2 bg-green-500 text-white text-xs">
                          {t("childStore.availableToYou")}
                        </Badge>
                      )}
                      {product.discountPercent && product.discountPercent > 0 && (
                        <Badge className="absolute top-2 end-2 bg-red-500 text-white text-xs font-bold">
                          -{product.discountPercent}%
                        </Badge>
                      )}
                      {product.isLibraryProduct && (
                        <Badge className="absolute bottom-2 start-2 bg-purple-500 text-white text-xs">
                          {product.libraryName || t('childStore.library')}
                        </Badge>
                      )}
                    </div>
                    <CardContent className="p-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{product.brand || "Classify"}</p>
                      <h3 className="font-medium text-xs sm:text-sm text-gray-800 dark:text-white line-clamp-2 mb-2 min-h-[2rem] sm:min-h-[2.5rem]">{product.nameAr || product.name}</h3>
                      <div className="flex items-center gap-1 mb-2">
                        {renderStars(product.rating)}
                        <span className="text-xs text-gray-400">({product.reviewCount || 0})</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          {product.originalPrice && parseFloat(product.originalPrice) > parseFloat(product.price) && (
                            <span className="text-xs text-gray-400 line-through">
                              {Math.round(parseFloat(product.originalPrice) * 10)} {t("childStore.point")}
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
                          <ShoppingCart className="w-4 h-4 me-1" />
                          {t("childStore.addBtn")}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  </motion.div>
                ) : (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                  <Card 
                    className="flex overflow-hidden hover:shadow-lg transition-shadow cursor-pointer dark:bg-gray-800 rounded-2xl"
                    onClick={() => setSelectedProduct(product)}
                    data-testid={`card-product-list-${product.id}`}
                  >
                    <div className="relative w-28 h-28 sm:w-40 sm:h-40 bg-gray-100 dark:bg-gray-700 flex-shrink-0">
                      {(product.images && product.images.length > 1) ? (
                        <ProductImageCarousel
                          images={product.images}
                          mainImage={product.image}
                          alt={product.name}
                          className="w-full h-full"
                          compact
                          hoverArrows
                          autoSlide
                          autoSlideInterval={2000}
                        />
                      ) : product.image ? (
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-12 h-12 text-gray-300" />
                        </div>
                      )}
                      {product.discountPercent && product.discountPercent > 0 && (
                        <Badge className="absolute top-2 end-2 bg-red-500 text-white text-xs font-bold">
                          -{product.discountPercent}%
                        </Badge>
                      )}
                      {product.isLibraryProduct && (
                        <Badge className="absolute bottom-2 start-2 bg-purple-500 text-white text-xs">
                          {product.libraryName || t('childStore.library')}
                        </Badge>
                      )}
                    </div>
                    <CardContent className="flex-1 p-4 flex flex-col justify-between">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{product.brand || "Classify"}</p>
                        <h3 className="font-medium text-gray-800 dark:text-white mb-2">{product.nameAr || product.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{product.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          {renderStars(product.rating)}
                          <span className="text-xs text-gray-400">({product.reviewCount || 0} {t("childStore.review")})</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex flex-col">
                          {product.originalPrice && parseFloat(product.originalPrice) > parseFloat(product.price) && (
                            <span className="text-xs text-gray-400 line-through">
                              {Math.round(parseFloat(product.originalPrice) * 10)} {t("childStore.point")}
                            </span>
                          )}
                          <div className="flex items-center gap-2 bg-yellow-100 text-yellow-700 px-3 py-2 rounded-full">
                            <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                            <span className="font-bold text-lg">{product.pointsPrice} {t("childStore.point")}</span>
                          </div>
                        </div>
                        <Button 
                          className="bg-orange-500 hover:bg-orange-600"
                          onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                        >
                          <ShoppingCart className="w-4 h-4 me-2" />
                          {t("childStore.addToCart")}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  </motion.div>
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
              {t("childStore.shoppingCart")} ({cart.length} {t("childStore.productUnit")})
            </DialogTitle>
          </DialogHeader>
          
          {cart.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">{t("childStore.cartEmpty")}</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {cart.map(item => (
                  <div key={item.product.id} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg flex-shrink-0 overflow-hidden">
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
                        {item.product.pointsPrice} {t("childStore.point")}
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
                  <span className="text-lg font-bold">{t("childStore.totalLabel")}</span>
                  <div className="flex items-center gap-2 bg-yellow-100 text-yellow-700 px-4 py-2 rounded-full">
                    <Star className="w-5 h-5 fill-yellow-500 text-yellow-500" />
                    <span className="font-bold text-xl">{cartTotalPoints} {t("childStore.point")}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{t("childStore.currentBalance")}</span>
                  <span className={`font-bold ${canAfford ? "text-green-600" : "text-red-600"}`}>
                    {childInfo?.totalPoints || 0} {t("childStore.point")}
                  </span>
                </div>

                {!canAfford && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-center">
                    <p className="text-red-600 dark:text-red-400 font-bold mb-2">{t("childStore.insufficientPoints")}</p>
                    <p className="text-red-500 text-sm mb-3">
                      {t("childStore.needMorePoints", { points: cartTotalPoints - (childInfo?.totalPoints || 0) })}
                    </p>
                    <Button
                      onClick={() => { setShowCart(false); navigate("/child-games"); }}
                      className="bg-green-500 hover:bg-green-600"
                      data-testid="button-play-games-cart"
                    >
                      <Gamepad2 className="w-4 h-4 me-2" />
                      {t("childStore.playToEarn")}
                    </Button>
                  </div>
                )}

                {canAfford && (
                  <Button 
                    className="w-full bg-orange-500 hover:bg-orange-600"
                    onClick={() => {
                      setShowCart(false);
                      if (!token) {
                        redirectToRequiredRegistration();
                        return;
                      }
                      setShowCheckout(true);
                    }}
                    data-testid="button-proceed-checkout"
                  >
                    <Star className="w-4 h-4 me-2" />
                    {t("childStore.completePurchasePoints")}
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
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <Bell className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="font-bold text-blue-800 dark:text-blue-300">{t("childStore.parentApprovalNeeded")}</p>
                  <p className="text-sm text-blue-600 dark:text-blue-400">{t("childStore.requestWillBeSentToParent")}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-xl">
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-500" />
                {t("childStore.paymentMethod")}
              </h3>
              <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border-2 border-yellow-400">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                    <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  </div>
                  <div>
                    <p className="font-bold">{t("childStore.payWithPoints")}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t("childStore.yourBalance")}: {childInfo?.totalPoints || 0} {t("childStore.points")}</p>
                  </div>
                </div>
                <Check className="w-6 h-6 text-green-500" />
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
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
                <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-orange-500" />
              {t("productDetail.title")}
            </DialogTitle>
          </DialogHeader>

          {selectedProduct && (
            <div className="space-y-6">
              <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden" style={{ aspectRatio: '4/3' }}>
                {(selectedProduct.images && selectedProduct.images.length > 1) ? (
                  <ProductImageCarousel
                    images={selectedProduct.images}
                    mainImage={selectedProduct.image}
                    alt={selectedProduct.name}
                    className="w-full h-full"
                    contain
                  />
                ) : selectedProduct.image ? (
                  <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full h-full object-contain rounded-xl" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-16 h-16 text-gray-300" />
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{selectedProduct.brand || "Classify"}</p>
                <h4 className="font-bold text-xl text-gray-800 dark:text-white">{selectedProduct.nameAr || selectedProduct.name}</h4>
                <p className="text-gray-500 dark:text-gray-400 mt-2">{selectedProduct.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  {renderStars(selectedProduct.rating)}
                  <span className="text-xs text-gray-400">({selectedProduct.reviewCount || 0} {t("productDetail.reviews")})</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t("productDetail.price")}</p>
                  <div className="flex items-center gap-2 text-2xl font-bold text-yellow-600">
                    <Star className="w-6 h-6 fill-yellow-500" />
                    {selectedProduct.pointsPrice} {t("productDetail.point")}
                  </div>
                </div>
                <div className="text-end">
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t("productDetail.yourBalance")}</p>
                  <p className={`text-xl font-bold ${(childInfo?.totalPoints || 0) >= selectedProduct.pointsPrice ? "text-green-600" : "text-red-600"}`}>
                    {childInfo?.totalPoints || 0} {t("productDetail.point")}
                  </p>
                </div>
              </div>

              {(childInfo?.totalPoints || 0) >= selectedProduct.pointsPrice ? (
                <Button
                  className="w-full bg-orange-500 hover:bg-orange-600 py-6"
                  onClick={() => { addToCart(selectedProduct); setSelectedProduct(null); }}
                  data-testid="button-add-to-cart"
                >
                  <ShoppingCart className="w-5 h-5 me-2" />
                  {t("productDetail.addToCart")}
                </Button>
              ) : (
                <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
                  <p className="text-red-600 dark:text-red-400 font-bold mb-2">{t("productDetail.insufficientPoints")}</p>
                  <p className="text-sm text-red-500 mb-4">
                    {t("productDetail.needMorePoints", { points: selectedProduct.pointsPrice - (childInfo?.totalPoints || 0) })}
                  </p>
                  <Button
                    onClick={() => navigate("/child-games")}
                    className="bg-green-500 hover:bg-green-600"
                  >
                    <Gamepad2 className="w-4 h-4 me-2" />
                    {t("productDetail.playToEarn")}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ChildBottomNav activeTab="games" />
    </div>
  );
};

export default ChildStore;
