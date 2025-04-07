'use client';

import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';

import db, { CollectionItem, ItemCategory } from '@/lib/db';
import { FormValues } from '@/types';

type DbContextType = {
  isLoading: boolean;
  getAllItems: () => Promise<CollectionItem[]>;
  getItemsByCategory: (category: ItemCategory) => Promise<CollectionItem[]>;
  addItem: (item: Omit<CollectionItem, 'id' | 'createdAt'>) => Promise<number | boolean>;
  updateItem: (
    id: number,
    updates: Partial<Omit<CollectionItem, 'id' | 'createdAt'>>
  ) => Promise<boolean>;
  deleteItem: (id: number) => Promise<boolean>;
  getItem: (id: number) => Promise<CollectionItem | undefined>;
};

const DbContext = createContext<DbContextType | undefined>(undefined);

export const DbProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initDatabase = async () => {
      try {
        await db.getAllItems();
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to initialize database:', error);
        toast.error('Failed to initialize database');
      }
    };

    initDatabase();
  }, []);

  const getAllItems = async (): Promise<CollectionItem[]> => {
    try {
      return await db.getAllItems();
    } catch (error) {
      console.error('Error getting all items:', error);
      toast.error('Failed to load items');
      return [];
    }
  };

  const getItemsByCategory = async (category: ItemCategory): Promise<CollectionItem[]> => {
    try {
      return await db.getItemsByCategory(category);
    } catch (error) {
      console.error(`Error getting ${category} items:`, error);
      toast.error(`Failed to load ${category} items`);
      return [];
    }
  };

  const addItem = async (item: FormValues): Promise<number | boolean> => {
    try {
      const newItemId = await db.addItem({
        name: item.name,
        description: item.description,
        category: item.category,
        images: item.images || [],
        rating: item.rating,
      });
      toast.success('Item added successfully');
      return newItemId;
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('Failed to add item');
      return false;
    }
  };

  const updateItem = async (
    id: number,
    updates: Partial<Omit<CollectionItem, 'id' | 'createdAt'>>
  ): Promise<boolean> => {
    try {
      await db.updateItem(id, updates);
      toast.success('Item updated successfully');
      return true;
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('Failed to update item');
      return false;
    }
  };

  const deleteItem = async (id: number): Promise<boolean> => {
    try {
      await db.deleteItem(id);
      toast.success('Item deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
      return false;
    }
  };

  const getItem = async (id: number): Promise<CollectionItem | undefined> => {
    try {
      return await db.getItem(id);
    } catch (error) {
      console.error(`Error getting item ${id}:`, error);
      toast.error('Failed to load item');
      return undefined;
    }
  };

  return (
    <DbContext.Provider
      value={{
        isLoading,
        getAllItems,
        getItemsByCategory,
        addItem,
        updateItem,
        deleteItem,
        getItem,
      }}
    >
      {children}
    </DbContext.Provider>
  );
};

export const useDb = () => {
  const context = useContext(DbContext);
  if (context === undefined) {
    throw new Error('useDb must be used within a DbProvider');
  }
  return context;
};
