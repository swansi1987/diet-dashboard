import { View, Text, StyleSheet } from 'react-native'

export default function WeightScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Weight Log</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' },
  text: { color: '#f1f5f9', fontSize: 24, fontWeight: '700' },
})
