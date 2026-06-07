import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
print(f"Loaded GEMINI_API_KEY: {api_key}")

if not api_key:
    print("Error: GEMINI_API_KEY not found in environment!")
    exit(1)

try:
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-2.5-flash")
    print("Attempting to generate a simple hello response...")
    response = model.generate_content("Say hello in one word.")
    print("Response:")
    print(response.text)
except Exception as e:
    print("An error occurred:")
    print(e)
