from setuptools import setup, find_packages

setup(
    name="auto_leave_assignment",
    version="1.0.0",
    description="Automatically assigns Casual Leave or LWP when employees are marked Absent",
    author="Azyntra Technologies",
    author_email="info@azyntra.com",
    packages=find_packages(),
    zip_safe=False,
    include_package_data=True,
    install_requires=[],
)
