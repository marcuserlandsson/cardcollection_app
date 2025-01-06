import { Stack, useRouter } from "expo-router";
import { TouchableOpacity } from "react-native";
import { Ionicons } from '@expo/vector-icons';

export default function RootLayout() {
  const router = useRouter();
  
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
            <TouchableOpacity onPress={() => {if (router.canGoBack()) {router.back()}}}>
              <Ionicons 
                name="chevron-back" 
                size={26} 
                color="#0865a3" 
                style={{ marginLeft: 10 }}
              />
            </TouchableOpacity>
          ),
        }}
      />
      <Stack.Screen name='+not-found'/>
    </Stack>
  );
}
