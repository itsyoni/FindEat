import Avatar from "@/components/common/Avatar";
import CreateLauncherButton from "@/components/create/CreateLauncherButton";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs } from "expo-router";
import {
  ChatCircleIcon,
  HouseIcon,
  MapTrifoldIcon,
} from "phosphor-react-native";
import React from "react";
import { View } from "react-native";
import { useAppTheme } from "@/contexts/ThemeContext";

export default function TabLayout() {
  const { user } = useAuth();
  const { isDark } = useAppTheme();
  const iconColor = isDark ? "#FAF9F6" : "#171717";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: isDark ? "#0B0B0A" : "#FAF9F6",
          borderTopColor: isDark ? "#1F2937" : "#E8E6E1",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => (
            <HouseIcon
              size={28}
              color={iconColor}
              weight={focused ? "fill" : "regular"}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: ({ focused }) => (
            <ChatCircleIcon
              size={28}
              color={iconColor}
              weight={focused ? "fill" : "regular"}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="create"
        options={{
          title: "Create",
          tabBarButton: (props) => (
            <CreateLauncherButton style={props.style} />
          ),
        }}
      />

      <Tabs.Screen
        name="map"
        options={{
          title: "Map",
          tabBarIcon: ({ focused }) => (
            <MapTrifoldIcon
              size={28}
              color={iconColor}
              weight={focused ? "fill" : "regular"}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => (
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: focused ? 2 : 0,
                borderColor: iconColor,
              }}
            >
              <Avatar
                uri={user?.avatarUrl}
                username={user?.username}
                userId={user?.id}
                size={28}
                showSnapIndicator={false}
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
