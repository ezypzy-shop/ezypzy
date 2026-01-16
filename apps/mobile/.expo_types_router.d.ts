/* eslint-disable */
import * as Router from 'expo-router';

export * from 'expo-router';

declare module 'expo-router' {
  export namespace ExpoRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: `/` | `/(tabs)` | `/(tabs)/` | `/(tabs)/account` | `/(tabs)/orders` | `/(tabs)/search` | `/account` | `/business-dashboard` | `/cart` | `/checkout` | `/contact` | `/create-business` | `/custom-request` | `/edit-profile` | `/notifications` | `/order-success` | `/orders` | `/search` | `/sign-in` | `/sign-up` | `/track-order`;
      DynamicRoutes: `/business/${Router.SingleRoutePart<T>}` | `/business-orders/${Router.SingleRoutePart<T>}` | `/manage-ads/${Router.SingleRoutePart<T>}` | `/manage-business/${Router.SingleRoutePart<T>}` | `/manage-products/${Router.SingleRoutePart<T>}`;
      DynamicRouteTemplate: `/business/[id]` | `/business-orders/[id]` | `/manage-ads/[id]` | `/manage-business/[id]` | `/manage-products/[id]`;
    }
  }
}
