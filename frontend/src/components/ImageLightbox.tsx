'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import styles from './ImageLightbox.module.css';
import { FaTimes, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

interface ImageLightboxProps {
  images: string[];
  initialImageIndex?: number;
  onClose: () => void;
}

export default function ImageLightbox({ images, initialImageIndex = 0, onClose }: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialImageIndex);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? images.length - 1 : prevIndex - 1,
    );
  }, [images.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prevIndex) =>
      prevIndex === images.length - 1 ? 0 : prevIndex + 1,
    );
  }, [images.length]);

  const handlePreviousClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    goToPrevious();
  };

  const handleNextClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    goToNext();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goToPrevious();
      if (e.key === 'ArrowRight') goToNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrevious, onClose]);


  if (!images || images.length === 0) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.container} onClick={(e) => e.stopPropagation()}>
        <Image
          src={images[currentIndex]}
          alt="Enlarged view"
          className={styles.image}
          fill
          sizes="(max-width: 800px) 90vw, 800px"
        />
        
        <button className={styles.closeButton} onClick={onClose}><FaTimes /></button>

        {images.length > 1 && (
          <>
            <button className={`${styles.navButton} ${styles.prevButton}`} onClick={handlePreviousClick}><FaChevronLeft /></button>
            <button className={`${styles.navButton} ${styles.nextButton}`} onClick={handleNextClick}><FaChevronRight /></button>
          </>
        )}
      </div>
    </div>
  );
}