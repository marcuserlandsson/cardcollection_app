import { Stack, useRouter, usePathname } from "expo-router";
import { TouchableOpacity } from "react-native";
import { Ionicons } from '@expo/vector-icons';

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();
  
  // Only hide back button on home screen
  const isHomeScreen = pathname === '/';
  
  return (
    <Stack>
      <Stack.Screen 
        name="(tabs)" 
        options={{
          headerShown: true,
          headerTitle: "",
          headerStyle: {
            backgroundColor: '#25292e',
          },
          headerShadowVisible: false,
          headerLeft: () => (
            !isHomeScreen ? (
              <TouchableOpacity onPress={() => router.back()}>
                <Ionicons 
                  name="chevron-back" 
                  size={26} 
                  color="#0865a3" 
                  style={{ marginLeft: 10 }}
                />
              </TouchableOpacity>
            ) : null
          ),
        }}
      />
      <Stack.Screen name='+not-found'/>
    </Stack>
  );
}
