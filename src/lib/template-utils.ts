/**
 * Template scaling utilities for responsive photo booth overlays
 */

export interface TemplateDimensions {
  width: number;
  height: number;
  aspectRatio: number;
}

export interface ViewportInfo {
  width: number;
  height: number;
  aspectRatio: number;
  isMobile: boolean;
  orientation: 'portrait' | 'landscape';
}

/**
 * Get current viewport information
 */
export const getViewportInfo = (): ViewportInfo => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const aspectRatio = width / height;
  const isMobile = width < 768; // Tailwind's md breakpoint
  const orientation = height > width ? 'portrait' : 'landscape';

  return {
    width,
    height,
    aspectRatio,
    isMobile,
    orientation
  };
};

/**
 * Calculate template dimensions for responsive scaling
 */
export const calculateTemplateDimensions = (
  templateDimensions: TemplateDimensions,
  viewportInfo: ViewportInfo,
  containerDimensions: { width: number; height: number }
): { width: number; height: number; x: number; y: number } => {
  const { width: containerWidth, height: containerHeight } = containerDimensions;
  const { aspectRatio: templateAspectRatio } = templateDimensions;
  const { aspectRatio: viewportAspectRatio, isMobile, orientation } = viewportInfo;

  let scaledWidth: number;
  let scaledHeight: number;
  let x: number;
  let y: number;

  // Calculate scaling based on container dimensions
  const containerAspectRatio = containerWidth / containerHeight;

  if (templateAspectRatio > containerAspectRatio) {
    // Template is wider than container - fit to width
    scaledWidth = containerWidth;
    scaledHeight = containerWidth / templateAspectRatio;
  } else {
    // Template is taller than container - fit to height
    scaledHeight = containerHeight;
    scaledWidth = containerHeight * templateAspectRatio;
  }

  // Center the template
  x = (containerWidth - scaledWidth) / 2;
  y = (containerHeight - scaledHeight) / 2;

  // For mobile portrait, ensure full coverage
  if (isMobile && orientation === 'portrait') {
    // Scale to cover the full height while maintaining aspect ratio
    scaledHeight = containerHeight;
    scaledWidth = containerHeight * templateAspectRatio;
    x = (containerWidth - scaledWidth) / 2;
    y = 0;
  }

  return {
    width: scaledWidth,
    height: scaledHeight,
    x: Math.max(0, x),
    y: Math.max(0, y)
  };
};

/**
 * Get template dimensions from image URL
 */
export const getTemplateDimensions = (imageUrl: string): Promise<TemplateDimensions> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
        aspectRatio: img.naturalWidth / img.naturalHeight
      });
    };
    img.onerror = reject;
    img.src = imageUrl;
  });
};

/**
 * Apply responsive template overlay to canvas
 */
export const applyResponsiveTemplate = async (
  canvas: HTMLCanvasElement,
  templateUrl: string,
  viewportInfo?: ViewportInfo
): Promise<void> => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const currentViewportInfo = viewportInfo || getViewportInfo();
  const templateDimensions = await getTemplateDimensions(templateUrl);
  
  const containerDimensions = {
    width: canvas.width,
    height: canvas.height
  };

  const scaledDimensions = calculateTemplateDimensions(
    templateDimensions,
    currentViewportInfo,
    containerDimensions
  );

  return new Promise((resolve, reject) => {
    const templateImg = new Image();
    templateImg.crossOrigin = "anonymous";
    templateImg.onload = () => {
      ctx.drawImage(
        templateImg,
        scaledDimensions.x,
        scaledDimensions.y,
        scaledDimensions.width,
        scaledDimensions.height
      );
      resolve();
    };
    templateImg.onerror = reject;
    templateImg.src = templateUrl;
  });
};

/**
 * CSS class for responsive template overlay
 */
export const getTemplateOverlayStyles = (viewportInfo: ViewportInfo) => {
  const { isMobile, orientation } = viewportInfo;
  
  return {
    width: '100%',
    height: '100%',
    objectFit: 'contain' as const,
    position: 'absolute' as const,
    top: 0,
    left: 0,
    zIndex: 2,
    background: 'transparent'
  };
};
