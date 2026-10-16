import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const KEY = "cordeiro_token";
const USER_KEY = "cordeiro_user";

export async function saveToken(token: string) {
  if (Platform.OS === "web") return AsyncStorage.setItem(KEY, token);
  return SecureStore.setItemAsync(KEY, token);
}
export async function getToken(): Promise<string | null> {
  if (Platform.OS === "web") return AsyncStorage.getItem(KEY);
  return SecureStore.getItemAsync(KEY);
}
export async function removeToken() {
  if (Platform.OS === "web") return AsyncStorage.removeItem(KEY);
  return SecureStore.deleteItemAsync(KEY);
}

export async function saveUser(user: unknown) {
  return AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}
export async function getUser<T = any>(): Promise<T | null> {
  const raw = await AsyncStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as T) : null;
}
export async function clearUser() {
  return AsyncStorage.removeItem(USER_KEY);
}
