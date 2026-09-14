'use client';

import 'yet-another-react-lightbox/styles.css';

import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import Lightbox, {
  IconButton,
  useController,
  useLightboxState,
  useLoseFocus,
  type ZoomRef,
} from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';

import styles from './image-viewer.module.css';
import { GalleryLayoutPlugin } from './image-viewer-layout';

type Props = {
  images: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialIndex?: number;
};

function ImageCounter() {
  const { currentIndex, slides } = useLightboxState();
  return (
    <span className={styles.counter} aria-hidden="true">
      {currentIndex + 1} <span>/ {slides.length}</span>
    </span>
  );
}

function ZoomControls({ zoom, minZoom, maxZoom, disabled, zoomIn, zoomOut, changeZoom }: ZoomRef) {
  const { focus } = useController();
  const cannotZoomIn = disabled || zoom >= maxZoom;
  const cannotZoomOut = disabled || zoom <= minZoom;
  const cannotFit = disabled || zoom === 1;
  const zoomInFocus = useLoseFocus(focus, cannotZoomIn);
  const zoomOutFocus = useLoseFocus(focus, cannotZoomOut);
  const fitFocus = useLoseFocus(focus, cannotFit);

  return (
    <>
      <IconButton
        label="Zoom out"
        icon={ZoomOut}
        disabled={cannotZoomOut}
        onClick={zoomOut}
        {...zoomOutFocus}
      />
      <IconButton
        label="Zoom in"
        icon={ZoomIn}
        disabled={cannotZoomIn}
        onClick={zoomIn}
        {...zoomInFocus}
      />
      <button
        type="button"
        className={`yarl__button ${styles.fit}`}
        aria-label="Fit image"
        title="Fit image"
        disabled={cannotFit}
        onClick={() => changeZoom(1)}
        {...fitFocus}
      >
        Fit
      </button>
    </>
  );
}

export function ImageViewer({ images, open, onOpenChange, initialIndex = 0 }: Props) {
  const descriptionId = useId();
  const [keyboardInput, setKeyboardInput] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [previousProps, setPreviousProps] = useState({ open, initialIndex });
  const propsChanged = previousProps.open !== open || previousProps.initialIndex !== initialIndex;
  if (propsChanged) setPreviousProps({ open, initialIndex });
  const requestedIndex = propsChanged && open ? initialIndex : currentIndex;
  const validIndex = Math.max(0, Math.min(requestedIndex, images.length - 1));
  if (currentIndex !== validIndex) setCurrentIndex(validIndex);

  const slides = useMemo(
    () => images.map((src, index) => ({ src, alt: `Image ${index + 1}` })),
    [images]
  );
  if (!images.length) return null;

  return (
    <Lightbox
      open={open}
      close={() => onOpenChange(false)}
      index={validIndex}
      slides={slides}
      on={{ view: ({ index }) => setCurrentIndex(index) }}
      plugins={[Zoom, GalleryLayoutPlugin]}
      className={styles.gallery}
      labels={{
        Lightbox: 'Image viewer',
        Previous: 'Previous image',
        Next: 'Next image',
        '{index} of {total}': 'Image {index} of {total}',
      }}
      portal={{
        container: {
          'aria-describedby': descriptionId,
          onKeyDownCapture: () => setKeyboardInput(true),
          onPointerDownCapture: () => setKeyboardInput(false),
        },
      }}
      carousel={{ padding: 16, preload: 2, imageFit: 'contain' }}
      controller={{ closeOnBackdropClick: false }}
      toolbar={{ buttons: [<ImageCounter key="counter" />, 'zoom', 'close'] }}
      animation={{ fade: 180, swipe: 220, navigation: 0, zoom: keyboardInput ? 0 : 200 }}
      render={{
        iconPrev: () => <ChevronLeft aria-hidden="true" />,
        iconNext: () => <ChevronRight aria-hidden="true" />,
        iconClose: () => <X aria-hidden="true" />,
        buttonZoom: (props) => <ZoomControls {...props} />,
        ...(images.length === 1 ? { buttonPrev: () => null, buttonNext: () => null } : {}),
        controls: () => (
          <p id={descriptionId} className="sr-only">
            Use the arrow keys to browse images. Zoom with the buttons, double-click or pinch. When
            zoomed in, drag or use arrow keys to move around the image. Fit shows the whole image.
            Press Escape to close.
          </p>
        ),
      }}
    />
  );
}
