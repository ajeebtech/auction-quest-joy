
from flask import Flask, send_file, jsonify
from flask_cors import CORS
import numpy as np
import torch
import os

app = Flask(__name__)
CORS(app)

@app.route('/models/<team>/<model_type>', methods=['GET'])
def get_model_weights(team, model_type):
    try:
        # Map file paths
        file_path = f'models/{team}/{model_type}'
        if os.path.exists(file_path):
            # Load the model weights
            weights = np.load(file_path, allow_pickle=True)
            # Convert to list for JSON serialization
            weights_list = weights.tolist()
            return jsonify({
                'weights': weights_list
            })
        else:
            return jsonify({'error': 'Model not found'}), 404
    except Exception as e:
        print(f"Error loading model: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000)
