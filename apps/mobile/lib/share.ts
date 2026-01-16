import * as Sharing from 'expo-sharing';
import { Platform, Share as RNShare, Alert } from 'react-native';

// App info for sharing
const APP_NAME = 'EzyPzy';
const APP_STORE_URL = 'https://ezypzy.shop'; // Replace with actual app store URL when available
const WEB_URL = 'https://ezypzy.shop';

export interface ShareContentOptions {
  title: string;
  message: string;
  url?: string;
  imageUrl?: string;
}

// Social media share URLs
const getSocialShareUrl = (platform: string, options: ShareContentOptions): string => {
  const encodedTitle = encodeURIComponent(options.title);
  const encodedMessage = encodeURIComponent(options.message);
  const encodedUrl = encodeURIComponent(options.url || WEB_URL);

  switch (platform) {
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedMessage}`;
    
    case 'twitter':
    case 'x':
      return `https://twitter.com/intent/tweet?text=${encodedMessage}&url=${encodedUrl}`;
    
    case 'whatsapp':
      return `https://wa.me/?text=${encodedMessage}%20${encodedUrl}`;
    
    case 'linkedin':
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
    
    case 'telegram':
      return `https://t.me/share/url?url=${encodedUrl}&text=${encodedMessage}`;
    
    case 'email':
      return `mailto:?subject=${encodedTitle}&body=${encodedMessage}%0A%0A${encodedUrl}`;
    
    default:
      return encodedUrl;
  }
};

// Share business profile
export const shareBusinessProfile = async (business: {
  id: number;
  name: string;
  description: string;
  image?: string;
  type?: string;
}) => {
  const url = `${WEB_URL}/business/${business.id}`;
  const message = `Check out ${business.name} on ${APP_NAME}! ${business.description || business.type || ''}`;
  
  const shareOptions: ShareContentOptions = {
    title: business.name,
    message: `${message}\n\nDiscover local businesses on ${APP_NAME}: ${APP_STORE_URL}`,
    url,
  };

  return shareContent(shareOptions);
};

// Share product
export const shareProduct = async (product: {
  id: number;
  name: string;
  price: number | string;
  image?: string;
  business_id: number;
  business_name?: string;
}) => {
  const url = `${WEB_URL}/business/${product.business_id}`;
  const price = typeof product.price === 'string' ? parseFloat(product.price) : product.price;
  const message = `Check out ${product.name} - ₹${price.toFixed(2)}${product.business_name ? ` at ${product.business_name}` : ''} on ${APP_NAME}!`;
  
  const shareOptions: ShareContentOptions = {
    title: product.name,
    message: `${message}\n\nShop local on ${APP_NAME}: ${APP_STORE_URL}`,
    url,
  };

  return shareContent(shareOptions);
};

// Share the app itself
export const shareApp = async () => {
  const shareOptions: ShareContentOptions = {
    title: APP_NAME,
    message: `Discover amazing local businesses and shop with ease on ${APP_NAME}!`,
    url: APP_STORE_URL,
  };

  return shareContent(shareOptions);
};

// Generic share function
export const shareContent = async (options: ShareContentOptions) => {
  try {
    // On web, use Web Share API if available, otherwise copy to clipboard
    if (Platform.OS === 'web') {
      // Check if Web Share API is available
      if (navigator.share) {
        await navigator.share({
          title: options.title,
          text: options.message,
          url: options.url,
        });
        return { success: true };
      } else {
        // Fallback: Copy to clipboard
        const shareText = `${options.message}\n\n${options.url || ''}`;
        await navigator.clipboard.writeText(shareText);
        Alert.alert('Copied!', 'Link copied to clipboard. You can now paste it anywhere to share.');
        return { success: true };
      }
    }

    // Use native share sheet on mobile (iOS/Android)
    const result = await RNShare.share({
      title: options.title,
      message: Platform.OS === 'ios' 
        ? options.message // iOS includes URL in message
        : `${options.message}\n\n${options.url || ''}`, // Android needs URL explicitly
      url: Platform.OS === 'ios' ? options.url : undefined, // iOS handles URL separately
    });

    // result can be undefined on some platforms, so check safely
    if (result && result.action === RNShare.sharedAction) {
      return { success: true };
    } else if (result && result.action === RNShare.dismissedAction) {
      return { success: false, dismissed: true };
    }
    
    // If result is undefined, assume success (happens on some Android devices)
    return { success: true };
  } catch (error: any) {
    console.error('Error sharing:', error);
    
    // On web, if clipboard fails too, show friendly message
    if (Platform.OS === 'web') {
      Alert.alert('Share', 'Please copy this link to share:\n\n' + (options.url || options.message));
    } else {
      Alert.alert('Share Error', 'Unable to share content. Please try again.');
    }
    return { success: false, error };
  }
};

// Share to specific social media platform (opens in browser)
export const shareToSocialMedia = (platform: string, options: ShareContentOptions) => {
  const shareUrl = getSocialShareUrl(platform, options);
  
  // On web, open in new window
  if (Platform.OS === 'web') {
    window.open(shareUrl, '_blank');
    return { success: true };
  }
  
  // On mobile, this would typically open in browser via Linking
  // But we'll use the native share instead which is more user-friendly
  return shareContent(options);
};

// Social media platform info for UI
export const socialPlatforms = [
  { id: 'facebook', name: 'Facebook', color: '#1877F2' },
  { id: 'x', name: 'X', color: '#000000' },
  { id: 'whatsapp', name: 'WhatsApp', color: '#25D366' },
  { id: 'linkedin', name: 'LinkedIn', color: '#0A66C2' },
  { id: 'telegram', name: 'Telegram', color: '#26A5E4' },
  { id: 'email', name: 'Email', color: '#EA4335' },
];
