import re


def clean_sql(text):
    text = re.sub(r"<think>.*?</think>", " ", text, flags=re.DOTALL)
    text = re.sub(r"```\w*", " ", text)
    text = text.replace("```", " ")
    return text.strip()
