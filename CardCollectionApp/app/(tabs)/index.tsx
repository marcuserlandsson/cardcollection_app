import { Text, View, StyleSheet, TouchableOpacity } from "react-native";
import {Link, useRouter} from "expo-router"

export default function Index() {
  const router = useRouter();
  
  return (
    <View style={styles.container}>
      <Text style={styles.text}>You should probably add some functionality dummy!</Text>
      
      <Link href="/database" asChild> 
          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>Card Database</Text>
          </TouchableOpacity>
      </Link>    
      <Link href="/collection" asChild> 
          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>Card Collection</Text>
          </TouchableOpacity>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#25292e',
    alignItems: 'center',
    justifyContent: 'space-evenly'
  },
  text: {
    color: '#fff'
  },
  button: {
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 5
  },
  buttonText: {
    fontSize: 20,
    textDecorationLine: 'underline',
    color: '#fff'
  },
  image: {
    width: 100,
    height: 100,
    marginTop: 20
  }
});
