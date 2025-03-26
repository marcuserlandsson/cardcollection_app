import { View, StyleSheet, FlatList, Image, Text, Dimensions, Pressable } from 'react-native';
import { useRouter } from 'expo-router';

const cardSets = [
    { id: 'BT20', title: 'BT20 - OVER THE X', image: require('../../assets/images/expansions/bt20.png') },
    { id: 'BT19', title: 'BT19 - XROS EVOLUTION', image: require('../../assets/images/expansions/bt19.png') },
    { id: 'BT18', title: 'BT18 - ELEMENT SUCCESSOR', image: require('../../assets/images/expansions/bt18.png') },
    { id: 'BT17', title: 'BT17 - SECRET CRISIS', image: require('../../assets/images/expansions/bt17.png') },
    { id: 'BT16', title: 'BT16 - BEGINNING OBSERVER', image: require('../../assets/images/expansions/bt16.png') },
    { id: 'BT15', title: 'BT15 - EXCEED APOCALYPSE', image: require('../../assets/images/expansions/bt15.png') },
    { id: 'BT14', title: 'BT14 - BLAST ACE', image: require('../../assets/images/expansions/bt14.png') },
    { id: 'BT13', title: 'BT13 - VERSUS ROYAL KNIGHT', image: require('../../assets/images/expansions/bt13.png') },
    { id: 'BT12', title: 'BT12 - ACROSS TIME', image: require('../../assets/images/expansions/bt12.png') },
    { id: 'BT11', title: 'BT11 - DIMENSIONAL PHASE', image: require('../../assets/images/expansions/bt11.png') },
];

interface CardSet {
    id: string;
    title: string;
    image: any; 
}

export default function DatabaseScreen() {
    const router = useRouter();

    const handleSetPress = (setId: string, setTitle: string) => {
        router.push({
            pathname: '/(tabs)/cardList',
            params: { setId, setTitle }
        });
    };

    const renderItem = ({ item }: { item: CardSet }) => (
        <Pressable 
            style={styles.cardSet}
            onPress={() => handleSetPress(item.id, item.title)}
        >
            <Image 
                source={item.image} 
                style={styles.cardImage}
            />
            <Text style={styles.cardTitle}>{item.title}</Text>
        </Pressable>
    );

    return (
        <View style={styles.container}>
            <FlatList
                data={cardSets}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                numColumns={2}
                columnWrapperStyle={styles.row}
            />
        </View>
    );
}

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2; 

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#25292e',
        padding: 16,
    },
    row: {
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    cardSet: {
        width: cardWidth,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#666',
    },
    cardImage: {
        width: '100%',
        height: cardWidth, 
        resizeMode: 'cover',
    },
    cardTitle: {
        color: '#fff',
        padding: 8,
        fontSize: 14,
        textAlign: 'center',
    }
});